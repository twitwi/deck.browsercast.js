// Sketch of browsercast / revealjs integration.
(function (global, document, $, deck, window, undefined) {

    var $document = $(document);
    
	/**
     * [from revealjs]
	 * Extend object a with the properties of object b.
	 * If there's a conflict, object b takes precedence.
	 */
	function extend(a, b) {
		for (var i in b) {
			a[i] = b[i];
		}
	}

	/**
     * [from revealjs]
	 * Converts the target object to an array.
	 */
	function toArray( o ) {
		return Array.prototype.slice.call( o );
	}

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

    function setCueLength() {
        var markers, markerLength, divs, slideCues, borderWidth;
        slideCues = getSlideCues();
        markers = document.getElementById('markers');
        borderWidth = 2;
        markerLength = markers.offsetWidth / slideCues.length - borderWidth;
        divs = document.getElementsByClassName('cue');
        for (var i = 0; i < divs.length; i++) {
            divs[i].setAttribute("style","width:" + markerLength + "px");
        };
    }

    function onCueClick(cue, popcorn) {
       popcorn.currentTime(cue.time);
    }

    // Use the audio timeupdates to drive existing slides.
    function playBrowserCast() {
        var audio, slideCues, popcorn, markers, div;

        slideCues = getSlideCues();

        // Look for the browsercast audio element.
        audio = document.getElementById('browsercast-audio');
        markers = document.getElementById('markers');

        popcorn = Popcorn(audio);

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
        setCueLength();

        window.onresize = setCueLength;

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

        // Start the 'cast!
        audio.play();

        /* TODO
        // Bind space to pause/play instead of the Reveal.js default.
        Reveal.configure({
            keyboard: {
                32: function () {
                    if (popcorn.paused() === true) {
                        popcorn.play()
                    } else {
                        popcorn.pause()
                    }
                }
            }
        });
        */
    }

    /* TODO?
    // Start recording a 'cast
    // In the end you can get the slide HTML with the cue attributes set
    // by running:
    //        browsercastRecorder.getHTMLSlides()
    // in the Javascript console.
    //
    // Press "Left" on the first slide to start recording.
    function recordBrowserCast() {
        Reveal.navigateTo(0);
        function CuePointTracker() {
            this.currentIndex = 0; // assume starting on first slide. not great.
            this.cuePoints = [];
            this.addCuePoint = function (ts) {
                var cp = {
                    ts: ts,
                    index: this.currentIndex
                };
                this.cuePoints.push(cp);
                this.currentIndex += 1;
            };

            this.getStartTS = function () {
                var first = this.cuePoints[0];
                return first.ts;
            };

            this.getHTMLSlides = function () {
                var slides, src, i, start, slideDiv;
                start = this.getStartTS();
                slides = document.getElementsByTagName('section');
                for (i = 0; i < this.cuePoints.length; i += 1) {
                    slides[i].attributes['data-bccue'].value = (this.cuePoints[i].ts - start)/1000.0;

                }
                slideDiv = document.getElementsByClassName('slides')[0];
                return slideDiv.innerHTML;
            };
        }

        var tracker = new CuePointTracker();
        global.browsercastRecorder = tracker;

        document.addEventListener('keydown', function (event) {
            if (event.keyIdentifier === 'Left' || event.keyIdentifier === 'Right') {
                var ts = event.timeStamp;
                tracker.addCuePoint(ts);
            }
        });
    }
    */

    $document.bind('deck.init', function() {
        playBrowserCast();
    });

})(window, window.document, jQuery, 'deck', this);
