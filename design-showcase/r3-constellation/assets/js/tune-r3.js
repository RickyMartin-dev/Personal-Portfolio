/* Constellation: tuning schema for the shared panel (shared/tune.js). */
if (window.RMTune) {
  RMTune.register({
    id: 'r3',
    name: 'Constellation',
    palettes: [
      { id: 'vega', name: 'Vega', swatch: ['#93a0ff', '#7fd6ff', '#ffd08a'],
        dark: { '--violet': '#93a0ff', '--cyan': '#7fd6ff', '--amber': '#ffd08a' },
        light: { '--violet': '#4a4fc0', '--cyan': '#1d6e9e', '--amber': '#ad6410' } },
      { id: 'orion', name: 'Orion', swatch: ['#6f9bff', '#9fe3ff', '#ffb35e'],
        dark: { '--violet': '#6f9bff', '--cyan': '#9fe3ff', '--amber': '#ffb35e' },
        light: { '--violet': '#2a56b8', '--cyan': '#17779f', '--amber': '#b45a00' } },
      { id: 'andromeda', name: 'Andromeda', swatch: ['#c58bff', '#ff9fd0', '#ffc2a0'],
        dark: { '--violet': '#c58bff', '--cyan': '#ff9fd0', '--amber': '#ffc2a0' },
        light: { '--violet': '#7a3fc2', '--cyan': '#b23a7e', '--amber': '#b0561f' } },
      { id: 'antares', name: 'Antares', swatch: ['#ff8a6e', '#ffb37a', '#ffd27a'],
        dark: { '--violet': '#ff8a6e', '--cyan': '#ffb37a', '--amber': '#ffd27a' },
        light: { '--violet': '#b83a22', '--cyan': '#b8610f', '--amber': '#9a6a00' } },
      { id: 'boreal', name: 'Boreal', swatch: ['#5ff0c0', '#6fd6ff', '#e7ff9a'],
        dark: { '--violet': '#5ff0c0', '--cyan': '#6fd6ff', '--amber': '#e7ff9a' },
        light: { '--violet': '#0f8a68', '--cyan': '#1a73a6', '--amber': '#6a6a00' } },
      { id: 'graphite', name: 'Graphite', swatch: ['#c7ccdd', '#9aa3bd', '#f0f1f7'],
        dark: { '--violet': '#c7ccdd', '--cyan': '#9aa3bd', '--amber': '#f0f1f7' },
        light: { '--violet': '#2a2f45', '--cyan': '#4a5170', '--amber': '#1d2133' } }
    ],
    groups: [
      { id: 'cursor', label: 'Cursor', controls: [
        { id: 'cursor', label: 'Mode', type: 'select', default: 'link',
          options: [{ value: 'link', label: 'Constellation link' }, { value: 'comet', label: 'Comet' }, { value: 'trail', label: 'Star trail' }, { value: 'none', label: 'None' }],
          hint: 'Link draws lines from the pointer to nearby stars.' },
        { id: 'linkRadius', label: 'Link radius', type: 'range', min: 80, max: 280, step: 5, unit: 'px', default: 170 }
      ] },
      { id: 'sky', label: 'Night sky', controls: [
        { id: 'density', label: 'Star density', type: 'range', min: 0.5, max: 1.6, step: 0.05, default: 1 },
        { id: 'twinkle', label: 'Twinkle', type: 'segmented', default: 'soft', options: [{ value: 'off', label: 'Off' }, { value: 'soft', label: 'Soft' }, { value: 'lively', label: 'Lively' }] },
        { id: 'labels', label: 'Label style', type: 'segmented', default: 'serif', options: [{ value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }, { value: 'hidden', label: 'Hidden' }] },
        { id: 'aurora', label: 'Aurora veil', type: 'range', min: 0, max: 1.5, step: 0.05, default: 0.8 },
        { id: 'ecliptic', label: 'Atlas ecliptic arc', type: 'toggle', default: true },
        { id: 'survey', label: 'Survey lines to summits', type: 'toggle', default: true },
        { id: 'shooting', label: 'Shooting stars', type: 'toggle', default: true }
      ] },
      { id: 'brand', label: 'Logo', controls: [
        { id: 'logo', label: 'Mark', type: 'select', default: 'constellation',
          options: [{ value: 'constellation', label: 'RM constellation' }, { value: 'star', label: 'Four-point star' }, { value: 'wordmark', label: 'Serif wordmark' }, { value: 'peak', label: 'Peak and star' }] }
      ] }
    ]
  });
}
