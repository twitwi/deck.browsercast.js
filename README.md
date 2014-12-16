deck.browsercast.js
===================

Browsercast extension for deck.js.
It replays an audio soundtrack synchronized with a deck.js slide deck.

See also [the demo repository](https://github.com/twitwi/deck.browsercast.js-demo). 

## Playing an existing browsercast presentation

It is quite simple, you can navigate in the same way as in any deck.js presentation.
The specific behavior comes from the presence of an audio soundtrack:

- the audio follows the current slide and vice versa
- you can play/pause the soundtrack using “space”
- you can click on the progress bar to jump to a particular slide


## How to create a browsercast (non-live recording)

You can follow these steps to create a browsercast with offline (non-live) recording:

0. make your deck of slides with deck.js, without anything special,
0. prepare your soundtrack
    - record your audio soundtrack
    - convert it to OGG if it is not already the case
0. prepare your slide deck for browsercast
    - add a `<meta name="audio" content="yourSoundtrack.ogg">` that references your audio file, into the `<head>`,
    - be sure to include the browsercast extension or use an enabled deck.js pack (see below),
    - you can still do some additional tuning of your slides,
0. record the timings
   - load your presentation in a browser, it should show an operational player,
   - start playing the audio soundtrack and use the right arrow to change slide when it should be done,
   - feel free to pause if you need to, or even go back to try again if you were slightly off,
   - when you're done, press 't', it should show a alert/popup message,
   - copy the content and save it to a file, for example named `timings.json`
   - edit the file so that there is only one line for each slide number, choosing the correct one if you did multiple tries,
   - save the file,
0. use your timings,
   -  add a `<meta name="audio" content="timings.json">` that references your timing file, into the `<head>`,
0. test by refreshing your page.


## How to include browsercast with deck.js

There are two alternatives.

### Include it

Have a look at the demo (master branch), the extension is made of four files:
- "browsercast/popcorn.js",
- "browsercast/deck.browsercast.js",
- "browsercast/deck.browsercast.css",
- "browsercast/player.css",

### Use/build a deck.js pack that contains it

(more instructions to be added)

## How to create a browsercast live (Feature To Be Added)

