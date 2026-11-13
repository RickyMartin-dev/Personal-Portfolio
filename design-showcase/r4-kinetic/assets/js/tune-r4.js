/* r4 Kinetic: tune panel schema (palette values per theme, version groups). */
if (window.RMTune) RMTune.register({
  id: 'r4',
  name: 'Kinetic',
  palettes: [
    { id: 'aurora', name: 'Aurora', swatch: ['#9f7bff', '#5dc7ff', '#ffb562'],
      dark: { '--violet': '#9f7bff', '--cyan': '#5dc7ff', '--amber': '#ffb562' },
      light: { '--violet': '#6a46d9', '--cyan': '#1d7fb8', '--amber': '#b8620a' } },
    { id: 'glacier', name: 'Glacier', swatch: ['#7c9cff', '#6fe0e6', '#cfe6ff'],
      dark: { '--violet': '#7c9cff', '--cyan': '#6fe0e6', '--amber': '#cfe6ff' },
      light: { '--violet': '#3b5bd0', '--cyan': '#0b7a8f', '--amber': '#1f5f99' } },
    { id: 'ember', name: 'Ember', swatch: ['#ff7a5c', '#ffcf6b', '#ff9a4d'],
      dark: { '--violet': '#ff7a5c', '--cyan': '#ffcf6b', '--amber': '#ff9a4d' },
      light: { '--violet': '#c2410c', '--cyan': '#a16207', '--amber': '#b23f08' } },
    { id: 'rose', name: 'Rose Quartz', swatch: ['#f08fbf', '#b9a4ff', '#ffc4a6'],
      dark: { '--violet': '#f08fbf', '--cyan': '#b9a4ff', '--amber': '#ffc4a6' },
      light: { '--violet': '#b0306f', '--cyan': '#6a46d9', '--amber': '#a8470f' } },
    { id: 'spruce', name: 'Spruce', swatch: ['#5fe0a6', '#5ec8ff', '#e6f27a'],
      dark: { '--violet': '#5fe0a6', '--cyan': '#5ec8ff', '--amber': '#e6f27a' },
      light: { '--violet': '#0f7a55', '--cyan': '#1d6fb0', '--amber': '#566a00' } },
    { id: 'mono', name: 'Mono Ink', swatch: ['#c9ccd8', '#8f95aa', '#ffffff'],
      dark: { '--violet': '#c9ccd8', '--cyan': '#8f95aa', '--amber': '#ffffff' },
      light: { '--violet': '#3b3f52', '--cyan': '#6b7088', '--amber': '#1a1d29' } }
  ],
  groups: [
    { id: 'headline', label: 'Headline', controls: [
      { id: 'hstyle', label: 'Headline style', type: 'segmented', default: 'serif',
        options: [{ value: 'serif', label: 'Serif' }, { value: 'sans', label: 'Heavy sans' }, { value: 'outline', label: 'Outline' }],
        hint: 'Serif follows the display font; outline strokes it.' },
      { id: 'reveal', label: 'Reveal', type: 'segmented', default: 'letters',
        options: [{ value: 'letters', label: 'Letters' }, { value: 'words', label: 'Words' }, { value: 'lines', label: 'Lines' }, { value: 'none', label: 'None' }] },
      { id: 'drift', label: 'Scroll drift', type: 'range', min: 0, max: 2, step: 0.1, default: 1, hint: 'How far the headline lines slide apart.' },
      { id: 'ridge', label: 'Ridge in front', type: 'segmented', default: 'front',
        options: [{ value: 'off', label: 'Off' }, { value: 'front', label: 'Front' }, { value: 'deep', label: 'Deep' }],
        hint: 'Summits that pass in front of the letters.' }
    ] },
    { id: 'interact', label: 'Interaction', controls: [
      { id: 'cursor', label: 'Cursor', type: 'select', default: 'ink',
        options: [{ value: 'ink', label: 'Magnetic ink' }, { value: 'spark', label: 'Spark trail' }, { value: 'comet', label: 'Comet' }, { value: 'none', label: 'None' }] },
      { id: 'magnet', label: 'Magnet strength', type: 'range', min: 0, max: 2, step: 0.1, default: 1 },
      { id: 'marquee', label: 'Marquee speed', type: 'range', min: 0.25, max: 3, step: 0.25, default: 1, unit: 'x' },
      { id: 'marqueeScroll', label: 'Marquee follows scroll', type: 'toggle', default: true }
    ] },
    { id: 'brand', label: 'Logo', controls: [
      { id: 'logo', label: 'Mark', type: 'select', default: 'peak',
        options: [{ value: 'peak', label: 'Peak monogram' }, { value: 'outline', label: 'Outlined RM' }, { value: 'wordmark', label: 'Wordmark + meteor' }, { value: 'classic', label: 'Classic line peak' }] }
    ] }
  ],
  apply: function () {}
});
