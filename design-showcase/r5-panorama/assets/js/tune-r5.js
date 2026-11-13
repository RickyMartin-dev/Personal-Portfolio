/* Tune panel schema for r5 Panorama. Palettes set only --violet / --cyan / --amber;
   the page derives sky, ridge fills and line colours from them. */
if (window.RMTune) {
  window.RMTune.register({
    id: 'r5',
    name: 'Panorama',
    palettes: [
      { id: 'aurora', name: 'Aurora', swatch: ['#9f7bff', '#5dc7ff', '#ffb562'],
        dark: { '--violet': '#9f7bff', '--cyan': '#5dc7ff', '--amber': '#ffb562' },
        light: { '--violet': '#6a46d9', '--cyan': '#1d7fb8', '--amber': '#c4700c' } },
      { id: 'glacier', name: 'Glacier', swatch: ['#7aa2ff', '#7ee0e6', '#ffe2b0'],
        dark: { '--violet': '#7aa2ff', '--cyan': '#7ee0e6', '--amber': '#ffe2b0' },
        light: { '--violet': '#3a5bc9', '--cyan': '#0e7f94', '--amber': '#b0701e' } },
      { id: 'ember', name: 'Ember', swatch: ['#d9627a', '#ff9f6b', '#ffd27a'],
        dark: { '--violet': '#d9627a', '--cyan': '#ff9f6b', '--amber': '#ffd27a' },
        light: { '--violet': '#b3324f', '--cyan': '#c2561a', '--amber': '#a8660a' } },
      { id: 'rose', name: 'Rose Quartz', swatch: ['#e58fc8', '#ffb3c7', '#ffd7b0'],
        dark: { '--violet': '#e58fc8', '--cyan': '#ffb3c7', '--amber': '#ffd7b0' },
        light: { '--violet': '#a83a85', '--cyan': '#c0405f', '--amber': '#a85a1a' } },
      { id: 'boreal', name: 'Boreal Jade', swatch: ['#5fc9a3', '#7fe0ff', '#e8f59a'],
        dark: { '--violet': '#5fc9a3', '--cyan': '#7fe0ff', '--amber': '#e8f59a' },
        light: { '--violet': '#1f7a5c', '--cyan': '#1d7fa0', '--amber': '#7d6f08' } },
      { id: 'ink', name: 'Mono Ink', swatch: ['#9aa0b8', '#cfd4e6', '#f2e6c8'],
        dark: { '--violet': '#9aa0b8', '--cyan': '#cfd4e6', '--amber': '#f2e6c8' },
        light: { '--violet': '#4a5068', '--cyan': '#2a2f45', '--amber': '#8a5a1a' } }
    ],
    groups: [
      { id: 'panorama', label: 'Panorama', controls: [
        { id: 'panlen', label: 'Pan length', type: 'segmented', default: 'standard',
          options: [{ value: 'short', label: 'Short' }, { value: 'standard', label: 'Standard' }, { value: 'long', label: 'Long' }],
          hint: 'How much scroll the camera pan takes.' },
        { id: 'parallax', label: 'Parallax depth', type: 'range', min: 0.5, max: 1.5, step: 0.05, default: 1, hint: 'How differently far and near ridges travel.' },
        { id: 'labels', label: 'Label density', type: 'segmented', default: 'all',
          options: [{ value: 'all', label: 'All' }, { value: 'roles', label: 'Roles' }, { value: 'minimal', label: 'Minimal' }] },
        { id: 'caption', label: 'Caption style', type: 'segmented', default: 'card',
          options: [{ value: 'card', label: 'Card' }, { value: 'note', label: 'Note' }, { value: 'plate', label: 'Plate' }] },
        { id: 'hud', label: 'Altitude line', type: 'toggle', default: true },
        { id: 'weight', label: 'Line weight', type: 'range', min: 0.7, max: 1.6, step: 0.05, default: 1 },
        { id: 'aurora', label: 'Aurora glow', type: 'range', min: 0, max: 1.5, step: 0.05, default: 1 }
      ] },
      { id: 'cursorg', label: 'Cursor', controls: [
        { id: 'cursor', label: 'Cursor effect', type: 'select', default: 'elevation',
          options: [{ value: 'elevation', label: 'Elevation trace' }, { value: 'comet', label: 'Comet' }, { value: 'sparkle', label: 'Sparkle' }, { value: 'none', label: 'None' }] }
      ] },
      { id: 'logog', label: 'Logo', controls: [
        { id: 'logo', label: 'Logo mark', type: 'segmented', default: 'peak',
          options: [{ value: 'peak', label: 'Peak' }, { value: 'rm', label: 'RM' }, { value: 'word', label: 'Wordmark' }] }
      ] }
    ],
    apply: function (s) {
      var d = document.documentElement;
      var hud = s && s.hud;
      d.setAttribute('data-r5-hud', hud === false || hud === 'off' ? 'off' : 'on');
    }
  });
}
