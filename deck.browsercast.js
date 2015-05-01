(function (global, document, $, deck, window, undefined) {


    function maybeAddSnippet(audioDataFile, options, andThen) {
        if (options.snippets.browsercast) {
            if ($(options.selectors.browsercast).size() > 0 && options.alert.goto) {
                alert("'options.snippets.browsercast' is true but a "+options.selectors.browsercast+" has been found."
                      +"\nThis might cause interaction glitches."
                      +"\n"
                      +"\nSuggestion: remove your html snippet or pass the {snippets: {browsercast: false}} option."
                     );
            }
            var ext = audioDataFile.replace(/.*[.]([^.]*)/, '$1');
            $('<div/>').addClass('browsercast')
                .append($('<audio/>').addClass("browsercast-audio")
                        .append($('<source/>').attr('src', audioDataFile).attr('type', 'audio/'+ext)))
                .append($('<menu/>').append($('<button/>').addClass('playpause')))
                .append($('<div/>').addClass('browsercast-markers')
                        .append($('<div/>').addClass('browsercast-time-label').text('1:00'))
                        .append($('<div/>').addClass('browsercast-total-time-label').text('9:99')))
                .appendTo($.deck('getContainer'));
        }
    }

    var $document = $(document);

    function togglePlay(popcorn) {
        if (popcorn.paused() === true) {
            popcorn.play()
        } else {
            popcorn.pause()
        }
    }

    function timeString(nSeconds) {
        return new Date(null, null, null, null, null, nSeconds)
            .toTimeString()
            .replace(/ .*$/, '')
            .replace(/^00:/, '');
    }

    function updatePlayPauseClass(paused, that, ifPlay, ifPause) {
        if (paused == true) {
            $(that).removeClass(ifPlay);
            $(that).addClass(ifPause);
        } else {
            $(that).removeClass(ifPause);
            $(that).addClass(ifPlay);
        }
    }

    // Use the audio timeupdates to drive existing slides.
    function playBrowserCast(timings, options) {
        var audio, popcorn, markers, bc;
        var divs = {};
        var nTimings = Object.keys(timings).length;
        var defaultWidth = (100./nTimings)+'%';

        var forEachTiming = function(f) {
            Object.keys(timings)
                .sort(function(a, b) {return a - b;})
                .forEach(f);
        };

        var inited = false; // to avoid the audio setting the current slide to 0 at the beginning (and allow bookmarking)

        bc = $(options.selectors.browsercast).get(0);
        audio = $(options.selectors.browsercastAudio).get(0);
        markers = $(options.selectors.browsercastMarkers).get(0);
        popcorn = Popcorn(audio);

        $('.playpause', bc).click(function() {
            togglePlay(popcorn);
        });

        forEachTiming(function(k, i) {
            var div = document.createElement('div');
            div.className = 'browsercast-cue';
            div.onclick = function(event) {
                popcorn.currentTime(timings[k]);
            };
            $(div)
                .css('width', defaultWidth)
                .css('box-sizing', 'border-box');
            markers.appendChild(div);
            divs[k] = div;
            popcorn.cue(k, timings[k], function () {
                if (!inited) return;
                transitionLock = true;
                $.deck('go', parseInt(k));
                $('.active', markers).removeClass('active');
                $(div).addClass('active');
                transitionLock = false;
            });
        });
        var trySetCueLengthAndPlay = function(retries, delay) {
            if (retries <= 0) { return; }
            var totalDuration = popcorn.duration();
            if (totalDuration > 0) { // it tests also for NaN
                var kPrev;
                forEachTiming(function(k, i) {
                    if (i != 0) {
                        var pc = 100 * (timings[k] - timings[kPrev]) / totalDuration;
                        $(divs[kPrev]).css('width', pc+'%');
                    }
                    kPrev = k;
                });
                var pc = 100 * (totalDuration - timings[kPrev]) / totalDuration;
                $(divs[kPrev]).css('width', pc+'%');
                // Start the 'cast!
                inited = true;
                var currentSlideIndex = $.deck('getSlides').indexOf($.deck('getSlide'));
                setTimeout(function() { // delay initialization for popcorn to be properly inited
                    $.deck('go', currentSlideIndex);
                }, 1);
            } else {
                setTimeout(function() {
                    trySetCueLengthAndPlay(retries - 1, delay*1.5);
                }, delay);
            }
        }

        // lock for preventing slidechanged event handler during timeupdate handler.
        // TODO using a mutex seems clunky.
        var transitionLock = false;

        // Decorator for creating an event handler that doesn't run
        // when the lock is active.
        var ifNotLocked = function (f) {
            return function (event) {
                if (!transitionLock) {
                    f.apply(this, arguments);
                }
            };
        };

        $document.bind('deck.change', ifNotLocked(function (event, from, to) {
            popcorn.currentTime(timings[to.toString()]);
            popcorn.play();
        }));


        var updatePlayPause = function() {
            $('.playpause').each(function() {
                updatePlayPauseClass(popcorn.paused(), this, 'pause', 'play');
            });
        };
        audio.addEventListener('pause', updatePlayPause);
        audio.addEventListener('playing', updatePlayPause);
        audio.addEventListener('timeupdate', function () {
            var estimatedTotal = popcorn.duration();
            var pc = 100 * audio.currentTime / estimatedTotal;
            var timeTxt = timeString(audio.currentTime);
            var totalTimeTxt = timeString(estimatedTotal);
            $(options.selectors.browsercastTimeLabel).css('left', pc+'%').text(timeTxt);
            $(options.selectors.browsercastTotalTimeLabel).text(totalTimeTxt);
        });
        
        $document.unbind('keydown.deckbcast').bind('keydown.deckbcast', function(e) {
            //opts.keys.scale || $.inArray(e.which, opts.keys.scale) > -1) {
            if (e.which === 32) {
                togglePlay(popcorn);
                e.preventDefault();
            }
        });

        trySetCueLengthAndPlay(20, 10);

    }

    function leftPad(number, targetLength, padding) {
        padding = padding || ' ';
        var output = number + '';
        while (output.length < targetLength) {
            output = padding + output;
        }
        return output;
    }

    // Start recording a 'cast
    // In the end you can get the slide HTML with the cue attributes set
    // by running:
    //        browsercastRecorder.getHTMLSlides()
    // in the Javascript console.
    //
    // Press 'Left' on the first slide to start recording.
    function recordBrowserCast(options) {

        var bc = $(options.selectors.browsercast);
        $(options.selectors.browsercastAudio).attr('controls', 'true');
        $(options.selectors.browsercastMarkers).hide();
        setTimeout(function(){ $.deck('go', 0); logs = [{time:0, slide:0}];}, 200);

        var $document = $(document);
        var audio = $(options.selectors.browsercastAudio).get(0);
        var logs = []; // as a list of pairs, so we can have multiple values and clean afterwards
        var exportLogs = function() {
            var res = '{\n';
            for (i in logs) {
                if (i != 0) {
                    res += ',\n';
                }
                res += leftPad('"'+logs[i].slide+'"', 8) + ':' + leftPad(logs[i].time.toFixed(2), 6);
            }
            res += '\n}\n';
            alert(res);
        };

        $document.bind('deck.change', function(event, from, to) {
            logs.push({time: audio.currentTime, slide: to});
        });
        $document.unbind('keydown.deckbcastrecord').bind('keydown.deckbcastrecord', function(e) {
            if (e.which === 84) { // 't'
                exportLogs();
            }
        });
    }

    function unsetKey(which, fromWhat) {
        if ($.isArray(fromWhat)) {
            var match = -1;
            while( (match = fromWhat.indexOf(which)) > -1 ) {
                fromWhat.splice(match, 1);
            }
        } else if ($.isPlainObject(fromWhat)) {
            for (var p in fromWhat) {
                if (fromWhat.hasOwnProperty(p)) {
                    unsetKey(which, fromWhat[p]);
                }
            }
        }
    }


    $.extend(true, $.deck.defaults, {
        selectors: {
            browsercast: '.browsercast',
            browsercastAudio: '.browsercast-audio',
            browsercastMarkers: '.browsercast-markers',
            browsercastTimeLabel: '.browsercast-time-label',
            browsercastTotalTimeLabel: '.browsercast-total-time-label'
        },
        
        snippets: {
            browsercast: true,
            browsercastAlways: false
        },
        
        alert: {
            browsercast: true
        }
    });


    $document.bind('deck.init', function() {
        var options = $.deck('getOptions');
        var audioDataFile = $('html>head>meta[name="audio"]').attr('content');
        if (audioDataFile === undefined) {
            return;
        }
        unsetKey(32, options.keys); // unbind space from 'next slide'
        maybeAddSnippet(audioDataFile, options);
        var timingDataFile = $('html>head>meta[name="timings"]').attr('content');
        if (timingDataFile === undefined) {
            recordBrowserCast(options);
        } else {
            $.getJSON(timingDataFile, function(timings) {
                playBrowserCast(timings, options);
            }).fail(function( jqxhr, textStatus, error ) {
                var err = textStatus + ', ' + error;
                console.log('[Browsercast] Request Failed: ' + err);
                if (options.alert.browsercast) {
                    alert('Timing file "' + timingDataFile + '" referenced but it was not found or wrong.\n' +
                          'See console logs for more details.\n' +
                          "Browsercast replay won't work, falling back to timing recording.");
                }
                recordBrowserCast();
            });
        }
    });

})(window, window.document, jQuery, 'deck', this);
