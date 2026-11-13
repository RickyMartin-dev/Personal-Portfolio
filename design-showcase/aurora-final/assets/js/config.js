/* Aurora Lines (final): the single config object. RM_DEFAULTS reproduces the shipped look exactly;
   apply.js writes only the delta from these values, so the hand-tuned CSS shows until something changes. */
(function () {
  'use strict';
  window.RM_DEFAULTS = {
    v: 1,
    theme: 'dark',
    /* v0 (2026-11-13): the owner's final Studio colours. The site follows the visitor's OS theme
       (bridge.js: ?theme= > saved toggle > prefers-color-scheme). Record: aurora-final/v0-config.json */
    colors: {
      dark: {
        bg: '#0d0f11', surface: '#1d2025', surface2: '#ffffff',
        text: '#eceff4', muted: '#bcc6d4', faint: '#8d99ab',
        accent: '#364cba', accentInk: '#0d0f12', accentText: '#88c0d0',
        aurora: ['#f9e0ae', '#a65995', '#46a0b9', '#0080ff', '#000000'],
        lineAlpha: 0.22, skyGlow: 0.8, lineGlow: 0.9
      },
      light: {
        bg: '#e3e3e3', surface: '#fbf9f3', surface2: '#e6e2d8',
        text: '#161614', muted: '#484640', faint: '#64625a',
        accent: '#a02727', accentInk: '#ffffff', accentText: '#161614',
        aurora: ['#931471', '#95d333', '#8d0c1e', '#4c8d25', '#7a2353'],
        lineAlpha: 0.16, skyGlow: 0, lineGlow: 0.97
      }
    },
    type: {
      display: 'Instrument Serif', body: 'Hanken Grotesk', mono: 'Geist Mono',
      displayWeight: 400, bodyWeight: 400, displayItalicAccent: true,
      /* multipliers, 1 = shipped size */
      size: { hero: 1, h2: 1, h3: 1, lead: 1, body: 1, small: 1, mono: 1, nav: 1, kinetic: 1, ticker: 1 },
      /* display: 1 sets every display heading to 1.0; the shipped look uses 0.93 to 1.08 per role, so the default is 0 = "as shipped" */
      lineHeight: { display: 0, body: 1.65 },
      /* tracking values are added (em) to each role's own native tracking */
      tracking: { display: 0, body: 0, mono: 0 },
      eyebrowCase: 'upper'
    },
    layout: {
      maxWidth: 1280, pad: 1, sectionGap: 1, radius: 4,
      heroAlign: 'left', heroV: 'top', heroHeight: 100, heroTextWidth: 36,
      nav: 'bar', navAlign: 'right', sticky: true,
      work: 'list',
      order: { index: ['work', 'kinetic', 'focus', 'contact'], about: ['profile', 'experience', 'toolkit', 'outside', 'contact'], games: ['gallery', 'contact'] },
      hidden: { index: [], about: [], games: [] },
      launcher: 'br'
    },
    motion: {
      level: 'full',
      heroDrawIn: true, heroDensity: 1, heroReveal: 1, heroDrift: 1,
      cursor: 'comet', cursorColor: 2,
      reveal: 'rise', revealDistance: 18,
      kinetic: { on: true, speed: 1, direction: 'left', pauseOnHover: true, separator: '▲', ticker: true },
      transition: 'none'
    },
    logo: { mark: 'sig-faithful', size: 1, showName: true, color: 'text', anim: 'none', rotate: 0 /* deg */, mirror: 'horizontal' /* none|horizontal|vertical|both */ },
    elements: {},
    copy: {}
  };

  /* The hand-tuned colours baked into afterglow.css. apply.js compares against these, not RM_DEFAULTS. */
  window.RM_BASELINE_COLORS = {
    dark: {
      bg: '#12131f', surface: '#191b2a', surface2: '#222437',
      text: '#f4f4f9', muted: '#b8bdd3', faint: '#8f96b4',
      accent: '#ffb562', accentInk: '#1a1204', accentText: '#ffb562',
      aurora: ['#ffb562', '#ff96aa', '#5dc7ff', '#7896ff', '#9f7bff'], /* crest, rose, sky, indigo, depth */
      lineAlpha: 0.12, skyGlow: 1, lineGlow: 1
    },
    light: {
      bg: '#f7f4fa', surface: '#ffffff', surface2: '#efeaf6',
      text: '#1f2434', muted: '#4d5369', faint: '#666c82',
      accent: '#ffb562', accentInk: '#1a1204', accentText: '#9a5200',
      aurora: ['#c4700c', '#d9577a', '#1d7fb8', '#4a63d8', '#6a46d9'],
      lineAlpha: 0.12, skyGlow: 1, lineGlow: 1
    }
  };

  window.RM_SECTIONS = {
    index: [
      { key: 'work', label: 'Selected work' },
      { key: 'kinetic', label: 'Kinetic band' },
      { key: 'focus', label: 'Current focus' },
      { key: 'contact', label: 'Contact' }
    ],
    about: [
      { key: 'profile', label: 'Profile' },
      { key: 'experience', label: 'Experience' },
      { key: 'toolkit', label: 'Toolkit' },
      { key: 'outside', label: 'Life outside code' },
      { key: 'contact', label: 'Contact' }
    ],
    games: [
      { key: 'gallery', label: 'Games gallery' },
      { key: 'contact', label: 'Contact' }
    ]
  };
})();
