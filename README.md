# a WebGL experiment

## Requirements

- Node.js (tested on Node 22) and npm
- [Bower](https://bower.io) (`npm install -g bower`) — used to fetch the
  front-end libraries into `app/src/vendor/`

## Instructions

### Out of the box

```
$ npm install
$ bower install
$ npx gulp build
$ npx gulp bundle
$ npx gulp serve
```

> Commands are run with `npx gulp` so the project's local gulp 5 is used — no
> global gulp install required.

### In details

#### Before anything

```
$ npm install     # build toolchain (gulp 5, browserify, ...)
$ bower install   # front-end libraries -> app/src/vendor/
```

`npm install` installs the build tools; `bower install` fetches the browser
libraries (jQuery, three.js, GSAP, howler, skrollr, normalize, visibly) into
`app/src/vendor/`. See [Front-end libraries](#front-end-libraries) for notes.

#### For development

Set `debug` and `watch` to **true** in `package.json`.

```
$ npx gulp build
```

The project will now auto rebuild on save.

#### For production

Set `debug` and `watch` to **false** in `package.json`.

```
$ npx gulp build
$ npx gulp bundle
```

`gulp build` compiles the app and vendor bundles; `gulp bundle` concatenates them
into the `bundle.js` that `index.html` loads. You can then grab the `index.html`
at the root, and everything in `app` (except `src`).

#### To serve

```
$ npx gulp serve
```

Go to `localhost:8000`.

## Front-end libraries

The browser libraries are vendored into `app/src/vendor/` by `bower install`
(`bower.json` pins the versions: jQuery 4, three.js r68, GSAP 3, howler 2,
normalize 8, skrollr 0.6.30, visibly). `app/src/vendor/` is **git-ignored**, so
run `bower install` after cloning.

Two things are worth knowing:

- **Bower is deprecated.** It still resolves these versions today (from the
  GitHub tags in `bower.json`) but is no longer maintained; migrating this step
  to npm is the eventual path.
- **GSAP needs a small compatibility shim.** GSAP 3 dropped the old
  `jquery.gsap.js` plugin the project relied on, so a hand-written replacement
  lives in `app/src/shims/jquery.gsap.js` (version-controlled, **not** under the
  bower-managed `vendor/` dir). It is pulled into the vendor bundle automatically.

Full upgrade details and rationale (incl. why three.js stays at r68) are in
[`UPGRADE-NOTES.md`](UPGRADE-NOTES.md).
