'use strict';

import jQuery from 'jquery';
import * as THREE from 'three';
import { TweenLite } from 'gsap';

import MobileUtils from '../utils/mobileUtils.js';

/**
 * Hello video particles.
 *
 * Replaces the old "HELLO" sprite in the hello section with a looping video
 * (Simon saying hi) rasterised into an interactive point cloud. Each frame the
 * video is sampled into a grid of particles whose colour/size track the pixels,
 * brighter pixels pop toward the camera for relief, and the cursor/finger pushes
 * nearby particles aside before they spring home.
 *
 * Designed to live inside the scroll-driven scene: it exposes the same
 * in/out/start/stop surface the other section objects use, sizes itself to fit
 * both phone and desktop viewports, and only animates while the section is live.
 *
 * @class HelloVideo
 * @constructor
 * @param {Object} [options]
 * @param {String} [options.src] Video URL
 * @requires jQuery, THREE, TweenLite, MobileUtils
 */
function HelloVideo (options) {
  var parameters = jQuery.extend({}, HelloVideo.defaultOptions, options);

  var isMobile = MobileUtils.isMobile();

  // Grid resolution doubles as the video sample resolution (count = cols*rows).
  // The grid aspect matches the 16:9 source so particles aren't stretched.
  this.rows = isMobile ? 52 : 80;
  this.cols = Math.round(this.rows * 16 / 9);
  this.count = this.cols * this.rows;

  // Base plane size in world units (16:9). fit() scales el to the viewport.
  this.baseHeight = 18;
  this.baseWidth = this.baseHeight * 16 / 9;

  this.camera = null;
  this.running = false;
  this._revealed = false;
  this._rafId = null;

  // Interaction radius / strength, in plane-local units.
  this.radius = this.baseWidth * 0.17;
  this.pushXY = this.baseWidth * 0.14;
  this.pushZ = 8;
  this.popZ = 3.2;          // video-brightness relief depth
  this.ease = isMobile ? 0.2 : 0.16;

  this.dpr = Math.min(window.devicePixelRatio || 1, 2);

  this._buildGeometry();
  this._buildVideo(parameters.src);

  this.el = new THREE.Points(this.geometry, this.material);
  this.el.frustumCulled = false;

  // Reusable scratch objects for the per-frame pointer raycast.
  this._raycaster = new THREE.Raycaster();
  this._plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  this._ndc = new THREE.Vector2();
  this._hit = new THREE.Vector3();
  this._pointerActive = false;
  this._pointerLocal = new THREE.Vector3();

  this._bindPointer();
  this.fit();

  this._onResize = this.fit.bind(this);
  jQuery(window).on('resize', this._onResize);
}

HelloVideo.defaultOptions = {
  src: './app/public/video/hi.mp4'
};

HelloVideo.vertexShader = [
  'attribute float aBrightness;',
  'attribute vec3 aOffset;',
  'uniform float uReveal;',
  'uniform float uPointScale;',
  'varying vec3 vColor;',
  'void main () {',
  '  vColor = color;',
  '  vec3 p = position + aOffset * (1.0 - uReveal);',
  '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
  '  gl_PointSize = (1.0 + aBrightness * 4.0) * uPointScale * uReveal;',
  '  gl_Position = projectionMatrix * mv;',
  '}'
].join('\n');

HelloVideo.fragmentShader = [
  'uniform float uOpacity;',
  'varying vec3 vColor;',
  'void main () {',
  '  vec2 c = gl_PointCoord - vec2(0.5);',
  '  float d = dot(c, c);',
  '  if (d > 0.25) discard;',
  '  float a = smoothstep(0.25, 0.04, d);',
  '  gl_FragColor = vec4(vColor, a * uOpacity);',
  '}'
].join('\n');

/**
 * Build the point cloud geometry + material.
 *
 * @method _buildGeometry
 */
HelloVideo.prototype._buildGeometry = function () {
  var cols = this.cols;
  var rows = this.rows;
  var count = this.count;
  var hw = this.baseWidth / 2;
  var hh = this.baseHeight / 2;

  this.home = new Float32Array(count * 3);
  var positions = new Float32Array(count * 3);
  var colors = new Float32Array(count * 3);
  var brightness = new Float32Array(count);
  var offsets = new Float32Array(count * 3);
  this.popTarget = new Float32Array(count);

  var i = 0;
  for (var y = 0; y < rows; y++) {
    for (var x = 0; x < cols; x++) {
      // Mirror X so the (selfie) video reads like a mirror.
      var nx = 1 - (x + 0.5) / cols;       // [0,1] mirrored
      var ny = (y + 0.5) / rows;           // [0,1] top->bottom
      var wx = (nx * 2 - 1) * hw;
      var wy = (1 - ny * 2) * hh;

      this.home[i * 3] = wx;
      this.home[i * 3 + 1] = wy;
      this.home[i * 3 + 2] = 0;

      positions[i * 3] = wx;
      positions[i * 3 + 1] = wy;
      positions[i * 3 + 2] = 0;

      // Deterministic scatter for the reveal (no Math.random in this codebase's
      // build-time path; a hash keeps it stable across reloads).
      var ang = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      ang = ang - Math.floor(ang);
      var ang2 = Math.sin(x * 39.346 + y * 11.135) * 24634.633;
      ang2 = ang2 - Math.floor(ang2);
      var theta = ang * Math.PI * 2;
      var spread = 6 + ang2 * 10;
      offsets[i * 3] = Math.cos(theta) * spread;
      offsets[i * 3 + 1] = Math.sin(theta) * spread;
      offsets[i * 3 + 2] = (ang2 - 0.5) * 8;

      i++;
    }
  }

  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 3));
  this.geometry = geometry;

  this.uniforms = {
    uReveal: { value: 0 },
    uOpacity: { value: 0 },
    uPointScale: { value: this.dpr * 2 }
  };

  this.material = new THREE.ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: HelloVideo.vertexShader,
    fragmentShader: HelloVideo.fragmentShader,
    vertexColors: true,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
};

/**
 * Build the looping, muted, inline video + its offscreen sampling canvas.
 *
 * @method _buildVideo
 */
HelloVideo.prototype._buildVideo = function (src) {
  var canvas = document.createElement('canvas');
  canvas.width = this.cols;
  canvas.height = this.rows;
  this._sampleCtx = canvas.getContext('2d', { willReadFrequently: true });

  var video = document.createElement('video');
  video.src = src;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('muted', '');
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  this.video = video;
  video.load();
};

/**
 * Track the pointer (mouse + touch) in normalised device coordinates so the
 * render step can raycast it onto the particle plane.
 *
 * @method _bindPointer
 */
HelloVideo.prototype._bindPointer = function () {
  var _this = this;

  function set (clientX, clientY) {
    _this._ndc.x = (clientX / window.innerWidth) * 2 - 1;
    _this._ndc.y = -((clientY / window.innerHeight) * 2 - 1);
    _this._pointerActive = true;
  }

  this._onPointerMove = function (e) {
    set(e.clientX, e.clientY);
  };
  this._onTouchMove = function (e) {
    if (e.touches && e.touches.length) {
      set(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  this._onPointerLeave = function () {
    _this._pointerActive = false;
  };

  window.addEventListener('pointermove', this._onPointerMove, { passive: true });
  window.addEventListener('touchmove', this._onTouchMove, { passive: true });
  window.addEventListener('touchend', this._onPointerLeave, { passive: true });
  window.addEventListener('mouseout', this._onPointerLeave, { passive: true });
};

/**
 * Give the object the live scene camera so pointer raycasting is exact across
 * the camera's drift / fov zoom. Without it, interactivity simply stays off.
 *
 * @method setCamera
 * @param {THREE.Camera} camera
 */
HelloVideo.prototype.setCamera = function (camera) {
  this.camera = camera;
  this.fit();
};

/**
 * Scale the cloud to fit the current viewport (phone portrait through wide
 * desktop) and size the points to match its on-screen footprint.
 *
 * @method fit
 */
HelloVideo.prototype.fit = function () {
  // Size against the camera's SETTLED fov, not its live value: the scene zooms
  // fov 200 -> 60 on entry, so reading camera.fov here (often 20 at setup) would
  // size the plane for the wrong projection. The pointer raycast still uses the
  // live camera, so interactivity stays exact.
  var fov = 60;
  var dist = (this.camera && this.camera.position) ? this.camera.position.z : 40;
  var aspect = window.innerWidth / Math.max(1, window.innerHeight);

  var visibleH = 2 * dist * Math.tan((fov * Math.PI) / 360);
  var visibleW = visibleH * aspect;

  // Fit within 92% of width and 64% of height, whichever is tighter.
  var scale = Math.min(
    (visibleW * 0.92) / this.baseWidth,
    (visibleH * 0.64) / this.baseHeight
  );
  if (!isFinite(scale) || scale <= 0) {
    scale = 1;
  }

  this._scale = scale;
  this.el.scale.set(scale, scale, scale);

  // Points are sized in screen pixels, so scale them with the cloud's apparent
  // size (and device pixel ratio) to keep density consistent everywhere.
  this.uniforms.uPointScale.value = Math.max(1.2, scale * this.dpr * 1.6);
};

/**
 * Sample the current video frame into the colour/size/relief attributes.
 *
 * @method _sampleVideo
 */
HelloVideo.prototype._sampleVideo = function () {
  var ctx = this._sampleCtx;
  var cols = this.cols;
  var rows = this.rows;
  var video = this.video;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cols, rows);

  if (video.readyState >= 2 && video.videoWidth > 0) {
    // "cover" crop the 16:9 source into the 16:9 grid (no distortion).
    var scale = Math.max(cols / video.videoWidth, rows / video.videoHeight);
    var dw = video.videoWidth * scale;
    var dh = video.videoHeight * scale;
    ctx.drawImage(video, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
  }

  var pixels = ctx.getImageData(0, 0, cols, rows).data;
  var colorArr = this.geometry.attributes.color.array;
  var brightArr = this.geometry.attributes.aBrightness.array;
  var popTarget = this.popTarget;

  for (var p = 0; p < this.count; p++) {
    var r = pixels[p * 4] / 255;
    var g = pixels[p * 4 + 1] / 255;
    var b = pixels[p * 4 + 2] / 255;
    var lum = 0.299 * r + 0.587 * g + 0.114 * b;

    colorArr[p * 3] = r;
    colorArr[p * 3 + 1] = g;
    colorArr[p * 3 + 2] = b;
    brightArr[p] = lum;
    popTarget[p] = lum * this.popZ;
  }

  this.geometry.attributes.color.needsUpdate = true;
  this.geometry.attributes.aBrightness.needsUpdate = true;
};

/**
 * Project the pointer onto the particle plane (object-local space).
 *
 * @method _updatePointer
 * @return {Boolean} whether a usable pointer position is available
 */
HelloVideo.prototype._updatePointer = function () {
  if (!this._pointerActive || !this.camera) {
    return false;
  }

  this._raycaster.setFromCamera(this._ndc, this.camera);
  var hit = this._raycaster.ray.intersectPlane(this._plane, this._hit);
  if (!hit) {
    return false;
  }

  this.el.updateWorldMatrix(true, false);
  this._pointerLocal.copy(hit);
  this.el.worldToLocal(this._pointerLocal);
  return true;
};

/**
 * Per-frame update: sample video, push particles from the pointer, spring home.
 *
 * @method _update
 */
HelloVideo.prototype._update = function () {
  if (!this.running) {
    return;
  }
  this._rafId = window.requestAnimationFrame(this._loop);

  // Visibility is driven by the camera's distance to this section, NOT by the
  // section's in/out edge events — the free-scroll navigation can fire a
  // spurious out() after you return, which used to leave the video running but
  // stuck at opacity 0 ("cuts off"). Deriving it from camera position each frame
  // makes the fade self-correcting in both directions.
  var vis = this._visibility();
  var uo = this.uniforms.uOpacity;
  uo.value += (vis - uo.value) * 0.1;

  // Pause decoding while scrolled away; resume as the section comes back.
  if (vis < 0.02) {
    if (!this.video.paused) {
      try { this.video.pause(); } catch (e) { /* noop */ }
    }
  } else if (this.video.paused) {
    var resume = this.video.play();
    if (resume && resume.catch) {
      resume.catch(function () {});
    }
  }

  // Nothing visible: skip the expensive sampling + interaction this frame.
  if (uo.value < 0.02) {
    return;
  }

  this._sampleVideo();

  var hasPointer = this._updatePointer();
  var plx = this._pointerLocal.x;
  var ply = this._pointerLocal.y;

  var pos = this.geometry.attributes.position.array;
  var home = this.home;
  var popTarget = this.popTarget;
  var R = this.radius;
  var R2 = R * R;
  var pushXY = this.pushXY;
  var pushZ = this.pushZ;
  var ease = this.ease;

  for (var p = 0; p < this.count; p++) {
    var ix = p * 3;
    var hx = home[ix];
    var hy = home[ix + 1];

    var desX = hx;
    var desY = hy;
    var desZ = popTarget[p];

    if (hasPointer) {
      var dx = hx - plx;
      var dy = hy - ply;
      var d2 = dx * dx + dy * dy;
      if (d2 < R2) {
        var d = Math.sqrt(d2) || 0.0001;
        var f = 1 - d / R;
        f = f * f;                     // softer falloff
        desX += (dx / d) * f * pushXY;
        desY += (dy / d) * f * pushXY;
        desZ += f * pushZ;
      }
    }

    pos[ix] += (desX - pos[ix]) * ease;
    pos[ix + 1] += (desY - pos[ix + 1]) * ease;
    pos[ix + 2] += (desZ - pos[ix + 2]) * ease;
  }

  this.geometry.attributes.position.needsUpdate = true;
};

/**
 * Fade factor (0..1) for how centred this section is on the camera. 1 when the
 * hello section fills the view, easing to 0 by the time the neighbouring section
 * is centred.
 *
 * @method _visibility
 * @return {Number}
 */
HelloVideo.prototype._visibility = function () {
  if (!this.camera) {
    return 1;
  }
  var sectionY = this.el.parent ? this.el.parent.position.y : 0;
  var d = Math.abs(this.camera.position.y - sectionY);
  // Fully visible within 15 world units, gone by 40 (section spacing is 50).
  var v = 1 - (d - 15) / 25;
  return Math.max(0, Math.min(1, v));
};

/**
 * Reveal. Visibility itself is camera-driven (see _update); in() just guarantees
 * the loop is live and plays the one-time scatter-in the first time we appear.
 *
 * @method in
 */
HelloVideo.prototype.in = function () {
  this.start();
};

/**
 * No-op: the camera-driven fade in _update handles hiding, so a stray out()
 * from the scroll system can never leave the video stuck invisible.
 *
 * @method out
 */
HelloVideo.prototype.out = function () {};

/**
 * Start the sampling/interaction loop and video playback.
 *
 * @method start
 */
HelloVideo.prototype.start = function () {
  if (!this._revealed) {
    this._revealed = true;
    TweenLite.to(this.uniforms.uReveal, 1.6, { value: 1, ease: 'power3.out' });
  }

  if (this.running) {
    return;
  }
  this.running = true;

  var play = this.video.play();
  if (play && play.catch) {
    play.catch(function () {});
  }

  var _this = this;
  this._loop = function () { _this._update(); };
  this._update();
};

/**
 * Pause sampling + playback. Visibility is restored automatically by start()
 * (called whenever the section becomes current again), so this can't strand the
 * video invisible.
 *
 * @method stop
 */
HelloVideo.prototype.stop = function () {
  if (!this.running) {
    return;
  }
  this.running = false;

  if (this._rafId) {
    window.cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }

  try {
    this.video.pause();
  } catch (e) { /* noop */ }
};

export default HelloVideo;
