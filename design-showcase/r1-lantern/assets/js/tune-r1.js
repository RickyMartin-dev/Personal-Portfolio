/* r1 Lantern: tune panel schema (the shared panel does the rest). */
(function () {
  'use strict';
  if (!window.RMTune) return;
  function pal(id, name, sw, dk, lt) { return { id: id, name: name, swatch: sw, dark: dk, light: lt }; }
  var palettes = [
    pal('night-hike', 'Night Hike', ['#8e96ff', '#4fd1c5', '#ffb45e'],
      { '--ground': '#0e1520', '--surface': '#151e2c', '--surface-2': '#1d283a', '--violet': '#8e96ff', '--cyan': '#4fd1c5', '--amber': '#ffb45e' },
      { '--ground': '#f5f2ec', '--surface': '#ffffff', '--surface-2': '#ece8f2', '--violet': '#4a55c8', '--cyan': '#137c86', '--amber': '#c06a0a' }),
    pal('aurora', 'Aurora', ['#9f7bff', '#5dc7ff', '#ffb562'],
      { '--ground': '#12131f', '--surface': '#191b2a', '--surface-2': '#222437', '--violet': '#9f7bff', '--cyan': '#5dc7ff', '--amber': '#ffb562' },
      { '--ground': '#f7f4fa', '--surface': '#ffffff', '--surface-2': '#efeaf6', '--violet': '#6a46d9', '--cyan': '#1d7fb8', '--amber': '#c4700c' }),
    pal('embers', 'Embers', ['#e8708f', '#ff9f68', '#ffc65c'],
      { '--ground': '#170f12', '--surface': '#21161a', '--surface-2': '#2e1e24', '--violet': '#e8708f', '--cyan': '#ff9f68', '--amber': '#ffc65c' },
      { '--ground': '#faf3ee', '--surface': '#ffffff', '--surface-2': '#f4e8e1', '--violet': '#b83b60', '--cyan': '#c2561a', '--amber': '#b86400' }),
    pal('moonlit', 'Moonlit Pass', ['#8aa4ff', '#9fe6ff', '#ffe29a'],
      { '--ground': '#0c1220', '--surface': '#141c2e', '--surface-2': '#1d2840', '--violet': '#8aa4ff', '--cyan': '#9fe6ff', '--amber': '#ffe29a' },
      { '--ground': '#f1f5fa', '--surface': '#ffffff', '--surface-2': '#e4ebf5', '--violet': '#3f5bd6', '--cyan': '#1c7ea8', '--amber': '#a87a06' }),
    pal('pine', 'Pine Ridge', ['#7bd3a8', '#8fd0ff', '#ffbf69'],
      { '--ground': '#0b1613', '--surface': '#12211c', '--surface-2': '#1a2f28', '--violet': '#7bd3a8', '--cyan': '#8fd0ff', '--amber': '#ffbf69' },
      { '--ground': '#f1f6f1', '--surface': '#ffffff', '--surface-2': '#e2ede4', '--violet': '#1f8a5b', '--cyan': '#2a76a8', '--amber': '#b4660a' }),
    pal('mono', 'Mono Lantern', ['#b9bdcc', '#d6d9e4', '#ffb562'],
      { '--ground': '#111214', '--surface': '#1a1b1e', '--surface-2': '#25272b', '--violet': '#b9bdcc', '--cyan': '#d6d9e4', '--amber': '#ffb562' },
      { '--ground': '#f5f4f2', '--surface': '#ffffff', '--surface-2': '#eae8e4', '--violet': '#4b5060', '--cyan': '#6a6f80', '--amber': '#c4700c' })
  ];
  function apply(s) {
    var art = document.querySelector('.hero .art');
    var night = s && s.depth !== undefined ? s.depth : 50;
    if (art) art.style.setProperty('--night', String(night / 100));
  }
  RMTune.register({
    id: 'r1',
    name: 'Lantern',
    palettes: palettes,
    groups: [
      { id: 'cursor', label: 'Cursor and light', controls: [
        { id: 'cursor', label: 'Cursor', type: 'select', default: 'lantern', options: [
          { value: 'lantern', label: 'Lantern' }, { value: 'comet', label: 'Comet' }, { value: 'fireflies', label: 'Fireflies' }, { value: 'none', label: 'None' }],
          hint: 'The lantern lights the engraved range. Other modes leave the light resting on the summit.' },
        { id: 'radius', label: 'Lantern radius', type: 'range', min: 90, max: 320, step: 10, unit: 'px', default: 200 },
        { id: 'warmth', label: 'Warmth', type: 'range', min: 0, max: 100, step: 5, unit: '%', default: 70, hint: 'From moonlight to lamp oil.' },
        { id: 'lag', label: 'Lag', type: 'range', min: 0, max: 100, step: 5, unit: '%', default: 55, hint: 'How slowly the light follows your hand.' }
      ] },
      { id: 'night', label: 'Night and sky', controls: [
        { id: 'depth', label: 'Night depth', type: 'range', min: 15, max: 90, step: 5, unit: '%', default: 50, hint: 'How dim the unlit range is.' },
        { id: 'stars', label: 'Stars', type: 'toggle', default: true },
        { id: 'aurora', label: 'Aurora veil', type: 'toggle', default: true }
      ] },
      { id: 'mark', label: 'Logo', controls: [
        { id: 'logo', label: 'Mark', type: 'segmented', default: 'monogram', options: [
          { value: 'monogram', label: 'RM line' }, { value: 'lantern', label: 'Lantern' }, { value: 'wordmark', label: 'Wordmark' }, { value: 'summit', label: 'Summit' }] }
      ] },
      { id: 'anim', label: 'Page animation', controls: [
        { id: 'reveal', label: 'Reveal style', type: 'select', default: 'mask', options: [
          { value: 'mask', label: 'Line mask' }, { value: 'rise', label: 'Rise' }, { value: 'fade', label: 'Fade' }, { value: 'none', label: 'None' }] },
        { id: 'trails', label: 'Trail routes on projects', type: 'toggle', default: true }
      ] }
    ],
    apply: apply
  });
})();
