'use strict';

var Howler = require('howler');
var Howl = require('howl');
var visibly = require('visibly');

/**
 * Sounds module
 *
 * @module SOUNDS
 * @requires Howler, visibly
 */
var SOUNDS = (function () {
  var instance;

  function init () {

    var isMuted = false;

    // Howler 2 dropped urls -> src and removed Howl.fadeIn/fadeOut in favour of
    // a single fade(from, to, duration). Re-add the v1 helpers on the looping
    // background track so the call sites in main3D.js stay unchanged.
    var background = new Howl({
      src: [
        './app/public/sounds/background.mp3',
        './app/public/sounds/background.ogg',
        './app/public/sounds/background.wav'
      ],
      loop: true,
      volume: 0.5
    });

    background.fadeIn = function (to, duration) {
      if (!this.playing()) {
        this.play();
      }
      this.fade(0, to, duration);
      return this;
    };

    background.fadeOut = function (to, duration) {
      this.fade(this.volume(), to, duration);
      return this;
    };

    return {
      /**
       * Toggle on/off sounds
       *
       * @method toogle
       */
      toggle: function () {
        // Howler 2 replaced mute()/unmute() with mute(boolean)
        Howler.mute(!isMuted);

        isMuted = !isMuted;
      },

      /**
       * Is muted
       * @method isMuted
       * @return {Boolean}
       */
      isMuted: function () {
        return Howler._muted;
      },

      background: background,
      wind: new Howl({
        src: [
          './app/public/sounds/wind.mp3',
          './app/public/sounds/wind.ogg',
          './app/public/sounds/wind.wav'
        ]
      }),
      whitenoise: new Howl({
        src: [
          './app/public/sounds/whitenoise.mp3',
          './app/public/sounds/whitenoise.ogg',
          './app/public/sounds/whitenoise.wav'
        ],
        volume: 0.05
      }),
      neon: new Howl({
        src: [
          './app/public/sounds/neon.mp3',
          './app/public/sounds/neon.ogg',
          './app/public/sounds/neon.wav'
        ],
        volume: 0.05
      })
    };
  }

  return  {
    /**
     * Return SOUNDS instance
     *
     * @method getInstance
     * @return {SOUNDS}
     */
    getInstance: function () {
      if (!instance) {
        instance = init();
      }

      return instance;
    }
  };
})();

// tab active/inactive
visibly.onHidden(function () {
  Howler.mute(true);
});

visibly.onVisible(function () {
  Howler.mute(false);
});

module.exports = SOUNDS.getInstance();