'use strict';

var Section = require('../classes/SectionClass');
var MobileUtils = require('../utils/mobileUtils');

var TextPanel = require('../objects3D/TextPanelObject3D');
var Rocks = require('../objects3D/RocksObject3D');

var rocksSection = new Section('rocks');

var rocks = new Rocks();
rocksSection.add(rocks.el);

// Mobile-responsive text settings
var isMobile = MobileUtils.isMobile();
var textOptions = {
  align: 'center', // Keep center alignment
  style: isMobile ? 'Bold' : '',
  size: isMobile ? 30 : 50, // Smaller text on mobile
  lineSpacing: isMobile ? 25 : 40 // Reduced line spacing on mobile
};

var text = new TextPanel(
  'K  E  E  P  \n  L  E  A  R  N  I  N  G',
  textOptions
);
text.el.position.set(0, 0, 0);
rocksSection.add(text.el);
text.out('down');

rocks.el.visible = false;

rocksSection.onIn(function () {
  text.in();
  rocks.in();
});

rocksSection.onOut(function (way) {
  text.out('down');
  rocks.out(way);
});

rocksSection.onStart(function () {
  rocks.start();
});

rocksSection.onStop(function () {
  rocks.stop();
});

rocksSection.show = function () {
  rocks.el.visible = true;
};

rocksSection.hide = function () {
  rocks.el.visible = false;
};

module.exports = rocksSection;