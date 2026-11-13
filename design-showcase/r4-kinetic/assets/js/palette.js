/* r4 palette helper: reads the live --violet / --cyan / --amber (set by the tune panel)
   so baked canvases and sprites follow the palette. Called on bake only, never per frame. */
(function () {
  'use strict';
  var root = document.documentElement;
  var cx = document.createElement('canvas').getContext('2d');
  function parse(c) {
    cx.fillStyle = '#000'; cx.fillStyle = c;
    var v = cx.fillStyle;
    if (v.charAt(0) === '#') return [parseInt(v.substr(1, 2), 16), parseInt(v.substr(3, 2), 16), parseInt(v.substr(5, 2), 16)];
    var m = v.match(/[\d.]+/g) || [255, 255, 255];
    return [+m[0], +m[1], +m[2]];
  }
  function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
  function str(a) { return a[0] + ',' + a[1] + ',' + a[2]; }
  function read() {
    var cs = getComputedStyle(root);
    return {
      dark: root.dataset.theme !== 'light',
      violet: parse(cs.getPropertyValue('--violet').trim() || '#9f7bff'),
      cyan: parse(cs.getPropertyValue('--cyan').trim() || '#5dc7ff'),
      amber: parse(cs.getPropertyValue('--amber').trim() || '#ffb562')
    };
  }
  function tune(id, def) {
    var v; try { v = window.RMTune && RMTune.get(id); } catch (e) {}
    return v === undefined || v === null ? def : v;
  }
  window.R4 = { parse: parse, mix: mix, str: str, read: read, tune: tune };
})();
