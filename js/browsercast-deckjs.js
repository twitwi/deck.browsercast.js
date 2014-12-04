// Sketch of browsercast / revealjs integration.
(function (global, document, $, deck, window, undefined) {

    var $document = $(document);

    function SlideCue(time, slideIndex) {
        this.time = time;
        this.slideIndex = slideIndex;
    }

    SlideCue.prototype = {
        focus: function () {
            $.deck('go', this.slideIndex);
        }
    };

    function parseCueTime(tag) {
        return parseFloat($(tag).attr('data-bccue'));
    }

    function getSlideCues() {
        var slides, slideCues, cue, cueTime, subCues;
        // Get a list of the slides and their cue tnimes.
        slides = $.deck('getSlides');
        slideCues = [];
        for (i = 0; i < slides.length; i += 1) {
            if (typeof slides[i].attr('data-bccue') !== 'undefined') {
                cueTime = parseCueTime(slides[i]);
                cue = new SlideCue(cueTime, i);
                slideCues.push(cue);
            }
        }
        return slideCues;
    }

    function estimateTotalDuration(popcorn) {
        return popcorn.duration();
    }

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

    function setCueLength(slideCues, totalDuration) {
        var markers, markerLength, divs;
        markers = document.getElementById('markers');
        var from = 0;
        for (i in slideCues) {
            var to = i == slideCues.length - 1 ? totalDuration : slideCues[parseInt(i)+1].time;
            var pc = 100 * (to - from) / totalDuration;
            from = to;
            slideCues[i].div.setAttribute("style", "width:" + pc + "%; box-sizing: border-box;");
        }
    }

    function onCueClick(cue, popcorn) {
       popcorn.currentTime(cue.time);
    }

    // Use the audio timeupdates to drive existing slides.
    function playBrowserCast() {
        var audio, slideCues, popcorn, markers, div, bc;

        slideCues = getSlideCues();
        bc = document.getElementById('browsercast');

        // Look for the browsercast audio element.
        audio = document.getElementById('browsercast-audio');
        markers = document.getElementById('markers');

        popcorn = Popcorn(audio);

        $(".playpause", bc).click(function() {
            togglePlay(popcorn);
        });

        var i = 0;
        slideCues.forEach(function (cue) {
            div = document.createElement('div');
            div.className = 'cue';
            div.setAttribute('data', "time:"+cue.time);
            cue.div = div;
            div.onclick = function(event) {
                        return onCueClick.call(this, cue, popcorn);
                    };
            markers.appendChild(div);

            popcorn.cue(i++, cue.time, function () {
                transitionLock = true;
                cue.focus();
                var active = document.querySelector(".active");
                if (active != null) active.classList.remove("active");
                cue.div.classList.add("active");
                transitionLock = false;
            });
        });
        var trySetCueLengthAndPlay = function(retries, delay) {
            if (retries <= 0) { return; }
            var total = estimateTotalDuration(popcorn);
            if (total > 0) { // it tests also for NaN
                setCueLength(slideCues, total);
                // Start the 'cast!
                audio.play();
            } else {
                setTimeout(function() {
                    trySetCueLengthAndPlay(retries - 1, delay*1.5);
                }, delay);
            }
        }
        trySetCueLengthAndPlay(20, 10);

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
            var cueTimeRaw, cueTime, newSlide, i, frags;

            // Extract the desired audio time from the target slide and seek to that time.
            newSlide = $.deck('getSlide', to); //Reveal.getSlide(indexh);
            if (typeof newSlide.attr('data-bccue') !== 'undefined') {
                cueTime = parseCueTime(newSlide);
                popcorn.currentTime(cueTime);
            }

            // If the slide changed after the 'cast finished, get the audio moving again.
            audio.play();
        }));


        var updatePlayPause = function() {
            $('.playpause').each(function() {
                updatePlayPauseClass(popcorn.paused(), this, 'pause', 'play');
            });
        };
        audio.addEventListener('pause', updatePlayPause);
        audio.addEventListener('playing', updatePlayPause);
        audio.addEventListener('timeupdate', function () {
            var estimatedTotal = estimateTotalDuration(popcorn);
            var pc = 100 * audio.currentTime / estimatedTotal;
            var timeTxt = timeString(audio.currentTime);
            $('.time-label').css("left", pc+'%').text(timeTxt);
        });
        
        $document.unbind('keydown.deckbcast').bind('keydown.deckbcast', function(e) {
            //opts.keys.scale || $.inArray(e.which, opts.keys.scale) > -1) {
            if (e.which === 32) {
                togglePlay(popcorn);
                e.preventDefault();
            }
        });

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
    // Press "Left" on the first slide to start recording.
    function recordBrowserCast() {

        $('audio').attr('controls', 'true');
        $('menu, #markers').hide();
        setTimeout(function(){ $.deck('go', 0); logs = [];}, 200);

        var $document = $(document);
        var audio = $('audio').get(0);
        var logs = []; // as a list of pairs, so we can have multiple values and clean afterwards
        var exportLogs = function() {
            var res = '{\n';
            for (i in logs) {
                res += leftPad(logs[i].slide, 6) + ':' + leftPad(logs[i].time.toFixed(2), 6) + '\n';
            }
            res += '}\n';
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

    unsetKey(32, $.deck.defaults.keys); // unbind space from "next slide"
    $document.bind('deck.init', function() {
        if (window.timings === undefined) {
            recordBrowserCast();
        } else {
            playBrowserCast();
        }
    });

})(window, window.document, jQuery, 'deck', this);
