/* Studio presets: palettes, fonts, pairings, type scales, starter looks.
   Plain browser JS (no modules). Palette values are WCAG AA checked
   (text >= 7, muted >= 4.5, faint >= 3, accentText >= 4.5, accentInk on accent >= 4.5). */
(function () {
  'use strict';

  var palettes = [ { "id": "user", "name": "User preference", "mood": "Owner's pick: parchment and oxblood by day, ice-blue and champagne by night.", "dark": { "bg": "#090a0b", "surface": "#09090b", "surface2": "#464c58", "text": "#eceff4", "muted": "#bcc6d4", "faint": "#8d99ab", "accent": "#6592c3", "accentInk": "#0d0f12", "accentText": "#88c0d0", "aurora": [ "#e8d0a1", "#000000", "#99e9ff", "#004285", "#000000" ], "lineAlpha": 0.22, "skyGlow": 1.5, "lineGlow": 0.9 }, "light": { "bg": "#f8f4ec", "surface": "#fbf9f3", "surface2": "#e8dcc2", "text": "#0d0d0c", "muted": "#211f1c", "faint": "#8c8a87", "accent": "#ae2424", "accentInk": "#faf9f9", "accentText": "#080808", "aurora": [ "#ae2424", "#ffffff", "#a06a46", "#0d0d0c", "#000000" ], "lineAlpha": 0.16, "skyGlow": 0.7, "lineGlow": 0.8 } }, { "id": "aurora", "name": "Aurora (original)", "mood": "Amber crest over indigo night, the original.", "dark": { "bg": "#12131f", "surface": "#191b2a", "surface2": "#222437", "text": "#f4f4f9", "muted": "#b8bdd3", "faint": "#8f96b4", "accent": "#ffb562", "accentInk": "#1a1204", "accentText": "#ffb562", "aurora": [ "#ffb562", "#ff96aa", "#5dc7ff", "#7896ff", "#9f7bff" ], "lineAlpha": 0.12, "skyGlow": 1, "lineGlow": 1 }, "light": { "bg": "#f7f4fa", "surface": "#ffffff", "surface2": "#efeaf6", "text": "#1f2434", "muted": "#4d5369", "faint": "#666c82", "accent": "#ffb562", "accentInk": "#1a1204", "accentText": "#9a5200", "aurora": [ "#c4700c", "#c8506e", "#1d7fb8", "#4a62d0", "#6a46d9" ], "lineAlpha": 0.12, "skyGlow": 1, "lineGlow": 1 } },
  {"id": "glacier", "name": "Glacier", "mood": "Pale ice and cold cyan on blue steel.", "dark": { "bg": "#0f1620", "surface": "#151e2b", "surface2": "#1d2837", "text": "#eef6fc", "muted": "#b5c6d6", "faint": "#8497ab", "accent": "#9fdcff", "accentInk": "#080b10", "accentText": "#9fdcff", "aurora": [ "#b4e4ff", "#8fd0ff", "#58e0e8", "#6f9bff", "#8a8cff" ], "lineAlpha": 0.12, "skyGlow": 0.9, "lineGlow": 1 }, "light": { "bg": "#f2f7fa", "surface": "#ffffff", "surface2": "#e6eff5", "text": "#12212e", "muted": "#42576a", "faint": "#5f7385", "accent": "#8fd3f0", "accentInk": "#0b0b0b", "accentText": "#4d7282", "aurora": [ "#1f78a8", "#3a8fc0", "#0d8a9b", "#2f5fd0", "#5a55c8" ], "lineAlpha": 0.14, "skyGlow": 0.9, "lineGlow": 0.9 } },
  {"id": "ember", "name": "Ember", "mood": "Coals and warm amber in a dark hearth.", "dark": { "bg": "#17110f", "surface": "#1f1714", "surface2": "#2a1e1a", "text": "#fbf1ea", "muted": "#cdb8ac", "faint": "#9f8678", "accent": "#ffc247", "accentInk": "#0c0908", "accentText": "#ffc247", "aurora": [ "#ffc247", "#ff8a4c", "#ff6a5a", "#e0566a", "#a8409a" ], "lineAlpha": 0.12, "skyGlow": 1.1, "lineGlow": 1.2 }, "light": { "bg": "#fbf5f0", "surface": "#ffffff", "surface2": "#f4e8df", "text": "#2a1912", "muted": "#5e4538", "faint": "#79604f", "accent": "#ffc247", "accentInk": "#0b0b0b", "accentText": "#856525", "aurora": [ "#b86a00", "#c25a12", "#c2402f", "#b3344a", "#8a3a8a" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1 } },
  {"id": "rose", "name": "Rose Quartz", "mood": "Soft pink glass over plum dusk.", "dark": { "bg": "#171119", "surface": "#201722", "surface2": "#2b1f2e", "text": "#fbf1f5", "muted": "#cdb6c4", "faint": "#9f8496", "accent": "#ffb3c1", "accentInk": "#0c090d", "accentText": "#ffb3c1", "aurora": [ "#ffb3a7", "#ffb3c1", "#d68ac8", "#8fb4ff", "#a58aff" ], "lineAlpha": 0.12, "skyGlow": 1, "lineGlow": 1 }, "light": { "bg": "#fbf4f6", "surface": "#ffffff", "surface2": "#f5e6ec", "text": "#2a1620", "muted": "#614354", "faint": "#7a5a6c", "accent": "#f4a6b8", "accentInk": "#0b0b0b", "accentText": "#8e606b", "aurora": [ "#c2566a", "#d0507a", "#a8408f", "#4a6fd0", "#7a4ad0" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1 } },
  {"id": "mono", "name": "Mono Ink", "mood": "Graphite and bone, colour removed.", "dark": { "bg": "#101114", "surface": "#17181c", "surface2": "#202228", "text": "#f4f4f6", "muted": "#bcc0ca", "faint": "#8e929e", "accent": "#f2f2f4", "accentInk": "#08090a", "accentText": "#f2f2f4", "aurora": [ "#f2f2f4", "#d4d6dd", "#b0b4c0", "#8e93a2", "#6c7182" ], "lineAlpha": 0.14, "skyGlow": 0.6, "lineGlow": 0.8 }, "light": { "bg": "#f6f6f4", "surface": "#ffffff", "surface2": "#ececea", "text": "#15161b", "muted": "#4a4c55", "faint": "#656872", "accent": "#1a1b20", "accentInk": "#ffffff", "accentText": "#1a1b20", "aurora": [ "#15161b", "#2e3038", "#4a4d58", "#686c78", "#8a8e9a" ], "lineAlpha": 0.16, "skyGlow": 0.6, "lineGlow": 0.8 } },
  {"id": "boreal", "name": "Boreal Green", "mood": "Green curtains over a black-teal pine sky.", "dark": { "bg": "#0b1714", "surface": "#11211c", "surface2": "#182d26", "text": "#eefaf4", "muted": "#b2cfc2", "faint": "#82a396", "accent": "#7dffb0", "accentInk": "#060c0a", "accentText": "#7dffb0", "aurora": [ "#d4ff8a", "#7dffb0", "#3de0c4", "#35a8e0", "#8a7bff" ], "lineAlpha": 0.12, "skyGlow": 1.1, "lineGlow": 1.1 }, "light": { "bg": "#f1f8f4", "surface": "#ffffff", "surface2": "#e2efe8", "text": "#102419", "muted": "#3d5a4a", "faint": "#5a7666", "accent": "#7dffb0", "accentInk": "#0b0b0b", "accentText": "#397551", "aurora": [ "#5a7a10", "#1a8a50", "#0c8a78", "#1a70a8", "#5a48c8" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1 } },
  {"id": "dusk", "name": "Desert Dusk", "mood": "Sandstone, rust and a violet horizon.", "dark": { "bg": "#1a1210", "surface": "#241a17", "surface2": "#30231f", "text": "#fbf0e8", "muted": "#d1b9aa", "faint": "#a08676", "accent": "#f0a070", "accentInk": "#0d0908", "accentText": "#f0a070", "aurora": [ "#ffd08a", "#f08a70", "#c4607a", "#7a5a9a", "#4a5a8a" ], "lineAlpha": 0.12, "skyGlow": 1, "lineGlow": 1 }, "light": { "bg": "#faf3ec", "surface": "#ffffff", "surface2": "#f3e5d8", "text": "#2e1c14", "muted": "#68493a", "faint": "#82604f", "accent": "#f0a070", "accentInk": "#0b0b0b", "accentText": "#906043", "aurora": [ "#a8620c", "#b8482e", "#a03a62", "#5e3f8a", "#3a4a8a" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1 } },
  {"id": "deepsea", "name": "Deep Sea", "mood": "Bioluminescent cyan in abyssal blue.", "dark": { "bg": "#06141f", "surface": "#0b1d2b", "surface2": "#112a3c", "text": "#ebf8ff", "muted": "#a9c8d9", "faint": "#7b9bb0", "accent": "#3fd0ff", "accentInk": "#030a10", "accentText": "#3fd0ff", "aurora": [ "#6ff0d8", "#3fd0ff", "#2a8fe0", "#2a5ad0", "#4a3ab0" ], "lineAlpha": 0.12, "skyGlow": 1.2, "lineGlow": 1.2 }, "light": { "bg": "#eef7fb", "surface": "#ffffff", "surface2": "#dcecf5", "text": "#0a2030", "muted": "#34566c", "faint": "#52758a", "accent": "#3fd0ff", "accentInk": "#0b0b0b", "accentText": "#23748f", "aurora": [ "#0a8a78", "#0a78b0", "#1a64b8", "#2a48b0", "#4a38a0" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1 } },
  {"id": "sakura", "name": "Sakura Night", "mood": "Cherry blossom pink under an ink-violet sky.", "dark": { "bg": "#15101a", "surface": "#1e1625", "surface2": "#291e33", "text": "#fcf1f7", "muted": "#cfb7c9", "faint": "#9f869b", "accent": "#ffb7d0", "accentInk": "#0b080d", "accentText": "#ffb7d0", "aurora": [ "#ffd0e0", "#ff9ec0", "#c8a0ff", "#8aa0ff", "#6a7ae0" ], "lineAlpha": 0.12, "skyGlow": 1, "lineGlow": 1 }, "light": { "bg": "#fdf5f8", "surface": "#ffffff", "surface2": "#f7e6ee", "text": "#2a1426", "muted": "#664558", "faint": "#80596f", "accent": "#ffb7d0", "accentInk": "#0b0b0b", "accentText": "#855f6c", "aurora": [ "#c24a7a", "#d0507a", "#8a50c0", "#4a5ac8", "#3a4ab0" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1 } },
  {"id": "solar", "name": "Solar Flare", "mood": "Hot yellow to crimson, high energy.", "dark": { "bg": "#14100a", "surface": "#1d170d", "surface2": "#292012", "text": "#fff6e6", "muted": "#d6c3a0", "faint": "#a69270", "accent": "#ffd24a", "accentInk": "#0a0805", "accentText": "#ffd24a", "aurora": [ "#fff08a", "#ffb030", "#ff6a30", "#e03a4a", "#9a2a8a" ], "lineAlpha": 0.12, "skyGlow": 1.2, "lineGlow": 1.3 }, "light": { "bg": "#fdf8ec", "surface": "#ffffff", "surface2": "#f6ecd2", "text": "#2a1f08", "muted": "#66541e", "faint": "#806c34", "accent": "#ffd24a", "accentInk": "#0b0b0b", "accentText": "#7f6925", "aurora": [ "#9a7000", "#b85a00", "#c23a1a", "#b02840", "#802a7a" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1.1 } },
  {"id": "moss", "name": "Moss & Copper", "mood": "Lichen greens with burnished copper.", "dark": { "bg": "#12150f", "surface": "#191d14", "surface2": "#232a1c", "text": "#f3f5ea", "muted": "#bcc4a8", "faint": "#8d967a", "accent": "#d89060", "accentInk": "#090b08", "accentText": "#d89060", "aurora": [ "#e8a070", "#c8b070", "#8ab070", "#5a9a80", "#5a7a9a" ], "lineAlpha": 0.12, "skyGlow": 0.9, "lineGlow": 1 }, "light": { "bg": "#f5f5ec", "surface": "#ffffff", "surface2": "#e8ead8", "text": "#1e2414", "muted": "#4a5436", "faint": "#667050", "accent": "#d89060", "accentInk": "#0b0b0b", "accentText": "#8f5f3f", "aurora": [ "#a05a20", "#8a7418", "#4a7a28", "#1a7a60", "#3a5a8a" ], "lineAlpha": 0.14, "skyGlow": 0.9, "lineGlow": 1 } },
  {"id": "nordic", "name": "Nordic Slate", "mood": "Frost, aurora and soft slate; calm and cool.", "dark": { "bg": "#1a1e24", "surface": "#212630", "surface2": "#2b313d", "text": "#eceff4", "muted": "#bcc6d4", "faint": "#8d99ab", "accent": "#88c0d0", "accentInk": "#0d0f12", "accentText": "#88c0d0", "aurora": [ "#ebcb8b", "#d08770", "#88c0d0", "#81a1c1", "#b48ead" ], "lineAlpha": 0.12, "skyGlow": 0.8, "lineGlow": 0.9 }, "light": { "bg": "#eceff4", "surface": "#ffffff", "surface2": "#dfe5ee", "text": "#232a36", "muted": "#4a566a", "faint": "#657288", "accent": "#88c0d0", "accentInk": "#0b0b0b", "accentText": "#4c6c74", "aurora": [ "#8a6410", "#a85a40", "#1a7890", "#3a5a98", "#785a98" ], "lineAlpha": 0.14, "skyGlow": 0.8, "lineGlow": 0.9 } },
  {"id": "neon", "name": "Neon Arcade", "mood": "Synthwave magenta, cyan and electric violet.", "dark": { "bg": "#0b0a14", "surface": "#121020", "surface2": "#1b1830", "text": "#f6f2ff", "muted": "#bcb6dc", "faint": "#8d86b4", "accent": "#ff3ea5", "accentInk": "#06050a", "accentText": "#ff3ea5", "aurora": [ "#fff04a", "#ff3ea5", "#2af0ff", "#6a5aff", "#b04aff" ], "lineAlpha": 0.14, "skyGlow": 1.3, "lineGlow": 1.4 }, "light": { "bg": "#f6f3fd", "surface": "#ffffff", "surface2": "#e8e2f8", "text": "#1a1230", "muted": "#48407a", "faint": "#63599a", "accent": "#ff3ea5", "accentInk": "#0b0b0b", "accentText": "#bd2e7a", "aurora": [ "#8a7600", "#c01a78", "#0a7a98", "#4030d0", "#8a20c8" ], "lineAlpha": 0.16, "skyGlow": 1, "lineGlow": 1.1 } },
  {"id": "sepia", "name": "Sepia Print", "mood": "Aged paper tones and iron-gall ink.", "dark": { "bg": "#1c1712", "surface": "#251f18", "surface2": "#312920", "text": "#f6ede0", "muted": "#cdbfa8", "faint": "#9d8f78", "accent": "#d9a860", "accentInk": "#0e0c09", "accentText": "#d9a860", "aurora": [ "#e8c88a", "#d08a60", "#a8886a", "#8a7a6a", "#6a5a50" ], "lineAlpha": 0.14, "skyGlow": 0.7, "lineGlow": 0.8 }, "light": { "bg": "#f4ecdc", "surface": "#fbf6ea", "surface2": "#e8dcc2", "text": "#2a2014", "muted": "#5e4e34", "faint": "#7a6848", "accent": "#d9a860", "accentInk": "#0b0b0b", "accentText": "#7e6138", "aurora": [ "#8a5a14", "#9a4a2a", "#7a5a3a", "#5a4a3a", "#3a3228" ], "lineAlpha": 0.16, "skyGlow": 0.7, "lineGlow": 0.8 } },
  {"id": "teal", "name": "Midnight Teal", "mood": "Deep teal ink with a warm coral spark.", "dark": { "bg": "#08171a", "surface": "#0e2125", "surface2": "#152d32", "text": "#ebfaf8", "muted": "#a8cbc8", "faint": "#79a09d", "accent": "#4fe0d0", "accentInk": "#040c0d", "accentText": "#4fe0d0", "aurora": [ "#ffb48a", "#4fe0d0", "#2ab0c8", "#3a80d0", "#6a60d0" ], "lineAlpha": 0.12, "skyGlow": 1, "lineGlow": 1 }, "light": { "bg": "#eef8f7", "surface": "#ffffff", "surface2": "#dbeeec", "text": "#0c2426", "muted": "#365e60", "faint": "#547a7c", "accent": "#4fe0d0", "accentInk": "#0b0b0b", "accentText": "#29746c", "aurora": [ "#b05a20", "#0a8a80", "#0a7a98", "#2a60b0", "#504ab0" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1 } },
  {"id": "lavender", "name": "Lavender Fog", "mood": "Powdery violet haze, gentle contrast of hue.", "dark": { "bg": "#17151f", "surface": "#201d2b", "surface2": "#2a2638", "text": "#f4f1fb", "muted": "#c2bbd8", "faint": "#9189ac", "accent": "#c8b6ff", "accentInk": "#0c0b10", "accentText": "#c8b6ff", "aurora": [ "#e8d0ff", "#ffb8e0", "#a8c0ff", "#9a90ff", "#b890ff" ], "lineAlpha": 0.12, "skyGlow": 0.9, "lineGlow": 0.9 }, "light": { "bg": "#f6f3fb", "surface": "#ffffff", "surface2": "#e9e3f6", "text": "#241e3a", "muted": "#524a78", "faint": "#6c6490", "accent": "#c8b6ff", "accentInk": "#0b0b0b", "accentText": "#6c628a", "aurora": [ "#8a4ab0", "#b04a90", "#3a60b8", "#5848c8", "#7a48c8" ], "lineAlpha": 0.14, "skyGlow": 0.9, "lineGlow": 0.9 } },
  {"id": "volcanic", "name": "Volcanic", "mood": "Basalt black with molten orange veins.", "dark": { "bg": "#120c0c", "surface": "#1b1212", "surface2": "#271a1a", "text": "#faeeea", "muted": "#d0b6af", "faint": "#a08882", "accent": "#ff5a30", "accentInk": "#090606", "accentText": "#ff5a30", "aurora": [ "#ffb070", "#ff6a30", "#d83a30", "#8a2a3a", "#4a3a5a" ], "lineAlpha": 0.12, "skyGlow": 1.1, "lineGlow": 1.3 }, "light": { "bg": "#f8f1ee", "surface": "#ffffff", "surface2": "#f0e0da", "text": "#2a1410", "muted": "#684238", "faint": "#835a50", "accent": "#ff5a30", "accentInk": "#0b0b0b", "accentText": "#b84123", "aurora": [ "#b05a10", "#c04010", "#a82a24", "#7a2038", "#4a3a6a" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1.1 } },
  {"id": "citrus", "name": "Citrus", "mood": "Lime, lemon and tangerine on dark olive.", "dark": { "bg": "#11150c", "surface": "#181e11", "surface2": "#212a17", "text": "#f6faea", "muted": "#c2cfa6", "faint": "#92a07a", "accent": "#d4f04a", "accentInk": "#090b06", "accentText": "#d4f04a", "aurora": [ "#f4f06a", "#ffb84a", "#a8e04a", "#4ac8a0", "#4a8ae0" ], "lineAlpha": 0.12, "skyGlow": 1, "lineGlow": 1.1 }, "light": { "bg": "#f8faee", "surface": "#ffffff", "surface2": "#ecf2d4", "text": "#1c260c", "muted": "#4a5a24", "faint": "#667a3c", "accent": "#d4f04a", "accentInk": "#0b0b0b", "accentText": "#667324", "aurora": [ "#7a7000", "#b06a00", "#4a8a10", "#0a8a68", "#2a60b8" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1 } },
  {"id": "ultraviolet", "name": "Ultraviolet", "mood": "Saturated violet, magenta and electric blue.", "dark": { "bg": "#100a1c", "surface": "#181028", "surface2": "#221836", "text": "#f5f0ff", "muted": "#c0b2e0", "faint": "#9082b4", "accent": "#b48aff", "accentInk": "#08050e", "accentText": "#b48aff", "aurora": [ "#e0b0ff", "#ff7ad8", "#8a8aff", "#5a4aff", "#3a2ab0" ], "lineAlpha": 0.12, "skyGlow": 1.2, "lineGlow": 1.2 }, "light": { "bg": "#f5f1fd", "surface": "#ffffff", "surface2": "#e6defa", "text": "#1c1038", "muted": "#4a3c80", "faint": "#6458a0", "accent": "#b48aff", "accentInk": "#0b0b0b", "accentText": "#775ba8", "aurora": [ "#8a30c0", "#c0289a", "#4a48d0", "#3a28c8", "#2a1a98" ], "lineAlpha": 0.14, "skyGlow": 1, "lineGlow": 1 } },
  {"id": "paper", "name": "Paper & Ink", "mood": "Off-white on near-black; a printed page.", "dark": { "bg": "#141414", "surface": "#1b1b1a", "surface2": "#252523", "text": "#f2efe8", "muted": "#c4c0b4", "faint": "#928e82", "accent": "#f2efe8", "accentInk": "#0a0a0a", "accentText": "#f2efe8", "aurora": [ "#f2efe8", "#c8c4b8", "#a8a49a", "#8a867c", "#6a665e" ], "lineAlpha": 0.14, "skyGlow": 0.5, "lineGlow": 0.7 }, "light": { "bg": "#f2efe8", "surface": "#fbfaf6", "surface2": "#e6e2d8", "text": "#161614", "muted": "#484640", "faint": "#64625a", "accent": "#161614", "accentInk": "#ffffff", "accentText": "#161614", "aurora": [ "#161614", "#3a3832", "#56544c", "#74726a", "#928f86" ], "lineAlpha": 0.16, "skyGlow": 0.5, "lineGlow": 0.7 } } ];

  function F(family, weights, italic, category, note) {
    return { family: family, weights: weights, italic: italic, category: category, note: note };
  }

  var fonts = {
    display: [
      F('Instrument Serif', [400], true, 'serif', 'Condensed editorial serif; the current look.'),
      F('Fraunces', [300, 400, 500, 600, 700], true, 'serif', 'Soft, wonky old-style with character.'),
      F('Playfair Display', [400, 500, 600, 700, 800, 900], true, 'serif', 'High-contrast transitional display.'),
      F('DM Serif Display', [400], true, 'serif', 'Sturdy, warm high-contrast serif.'),
      F('Cormorant Garamond', [300, 400, 500, 600, 700], true, 'serif', 'Delicate Garamond display, very elegant.'),
      F('Newsreader', [300, 400, 500, 600, 700], true, 'serif', 'Refined text-and-display serif.'),
      F('Libre Caslon Display', [400], false, 'serif', 'Fine classical Caslon for large sizes.'),
      F('Bodoni Moda', [400, 500, 600, 700, 800, 900], true, 'serif', 'Fashion-magazine Didone.'),
      F('Gloock', [400], false, 'serif', 'Chunky contrast serif with punch.'),
      F('Young Serif', [400], false, 'serif', 'Friendly heavy old-style serif.'),
      F('EB Garamond', [400, 500, 600, 700, 800], true, 'serif', 'Classic Garamond revival.'),
      F('Space Grotesk', [300, 400, 500, 600, 700], false, 'sans', 'Quirky technical grotesk.'),
      F('Syne', [400, 500, 600, 700, 800], false, 'sans', 'Wide, artsy geometric display.'),
      F('Bricolage Grotesque', [300, 400, 500, 600, 700, 800], false, 'sans', 'Expressive variable grotesque.'),
      F('Unbounded', [300, 400, 500, 600, 700, 800, 900], false, 'display', 'Rounded wide futuristic display.'),
      F('Zilla Slab', [300, 400, 500, 600, 700], true, 'slab', 'Friendly slab with a technical feel.'),
      F('Roboto Slab', [300, 400, 500, 600, 700, 800], false, 'slab', 'Neutral geometric slab.'),
      F('Abril Fatface', [400], false, 'display', 'Heavy poster Didone.'),
      F('Big Shoulders Display', [300, 400, 500, 600, 700, 800, 900], false, 'display', 'Condensed industrial poster face.')
    ],
    body: [
      F('Hanken Grotesk', [300, 400, 500, 600, 700], true, 'sans', 'Neutral, crisp; the current body face.'),
      F('Inter Tight', [300, 400, 500, 600, 700], true, 'sans', 'Tighter Inter, UI-clean.'),
      F('Manrope', [300, 400, 500, 600, 700, 800], false, 'sans', 'Modern geometric-humanist.'),
      F('Work Sans', [300, 400, 500, 600, 700], true, 'sans', 'Open, workmanlike grotesk.'),
      F('IBM Plex Sans', [300, 400, 500, 600, 700], true, 'sans', 'Engineered, slightly technical.'),
      F('Outfit', [300, 400, 500, 600, 700], false, 'sans', 'Geometric and friendly.'),
      F('Figtree', [300, 400, 500, 600, 700], true, 'sans', 'Clean and approachable.'),
      F('Sora', [300, 400, 500, 600, 700], false, 'sans', 'Wide techy geometric.'),
      F('DM Sans', [300, 400, 500, 600, 700], true, 'sans', 'Low-contrast geometric.'),
      F('Plus Jakarta Sans', [300, 400, 500, 600, 700], true, 'sans', 'Polished contemporary sans.'),
      F('Public Sans', [300, 400, 500, 600, 700], true, 'sans', 'Sober, highly legible.'),
      F('Albert Sans', [300, 400, 500, 600, 700], true, 'sans', 'Light geometric with warmth.'),
      F('Instrument Sans', [400, 500, 600, 700], true, 'sans', 'Companion to Instrument Serif.'),
      F('Schibsted Grotesk', [400, 500, 600, 700], true, 'sans', 'Editorial news grotesk.'),
      F('Space Grotesk', [300, 400, 500, 600, 700], false, 'sans', 'Quirky technical grotesk.'),
      F('Source Serif 4', [300, 400, 500, 600, 700], true, 'serif', 'Serif body for a bookish feel.'),
      F('Lora', [400, 500, 600, 700], true, 'serif', 'Calligraphic serif body.')
    ],
    mono: [
      F('Geist Mono', [300, 400, 500, 600, 700], false, 'mono', 'Clean, precise; the current mono.'),
      F('JetBrains Mono', [300, 400, 500, 600, 700], true, 'mono', 'Developer favourite, tall x-height.'),
      F('IBM Plex Mono', [300, 400, 500, 600, 700], true, 'mono', 'Humanist mono with personality.'),
      F('Space Mono', [400, 700], true, 'mono', 'Retro-geometric mono.'),
      F('DM Mono', [300, 400, 500], true, 'mono', 'Soft, rounded mono.'),
      F('Fira Code', [300, 400, 500, 600, 700], false, 'mono', 'Coder mono with ligatures.'),
      F('Martian Mono', [300, 400, 500, 600, 700], false, 'mono', 'Wide, wired techno mono.'),
      F('Red Hat Mono', [300, 400, 500, 600, 700], true, 'mono', 'Friendly corporate mono.'),
      F('Source Code Pro', [300, 400, 500, 600, 700], true, 'mono', 'Adobe classic coding face.')
    ]
  };

  function P(id, name, display, body, mono, dw, bw, note) {
    return { id: id, name: name, display: display, body: body, mono: mono, displayWeight: dw, bodyWeight: bw, note: note };
  }
  var pairings = [
    P('original', 'Original', 'Instrument Serif', 'Hanken Grotesk', 'Geist Mono', 400, 400, 'Editorial serif with a quiet grotesk.'),
    P('magazine', 'Magazine', 'Playfair Display', 'Inter Tight', 'IBM Plex Mono', 500, 400, 'High-contrast headlines, tight UI body.'),
    P('soft-serif', 'Soft serif', 'Fraunces', 'Figtree', 'DM Mono', 400, 400, 'Warm and slightly wonky.'),
    P('gallery', 'Gallery', 'Cormorant Garamond', 'Work Sans', 'Geist Mono', 400, 400, 'Delicate display over a sturdy sans.'),
    P('fashion', 'Fashion', 'Bodoni Moda', 'Albert Sans', 'Space Mono', 500, 400, 'Didone drama with airy body.'),
    P('techno', 'Technical', 'Space Grotesk', 'IBM Plex Sans', 'JetBrains Mono', 500, 400, 'All-sans engineering voice.'),
    P('poster', 'Poster', 'Bricolage Grotesque', 'Manrope', 'Martian Mono', 700, 400, 'Loud expressive grotesque headlines.'),
    P('bookish', 'Bookish', 'Newsreader', 'Source Serif 4', 'Source Code Pro', 400, 400, 'Serif throughout, like a long read.'),
    P('slab', 'Slab', 'Zilla Slab', 'Public Sans', 'Fira Code', 500, 400, 'Friendly slab, neutral body.'),
    P('wide', 'Wide', 'Syne', 'Sora', 'Red Hat Mono', 700, 400, 'Wide geometric, art-school energy.'),
    P('classic', 'Classic', 'EB Garamond', 'Lora', 'IBM Plex Mono', 400, 400, 'Old-style Garamond with Lora body.'),
    P('caslon', 'Caslon', 'Libre Caslon Display', 'Instrument Sans', 'Geist Mono', 400, 400, 'Fine Caslon over Instrument Sans.'),
    P('chunky', 'Chunky', 'Gloock', 'DM Sans', 'DM Mono', 400, 400, 'Heavy serif headlines, soft body.'),
    P('futurist', 'Futurist', 'Unbounded', 'Outfit', 'Space Mono', 500, 400, 'Rounded wide display, geometric body.')
  ];

  function T(id, name, hero, h2, h3, lead, body, small, mono, nav, kinetic, ticker) {
    return { id: id, name: name, size: { hero: hero, h2: h2, h3: h3, lead: lead, body: body, small: small, mono: mono, nav: nav, kinetic: kinetic, ticker: ticker } };
  }
  var typeScales = [
    T('default', 'Default', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1),
    T('compact', 'Compact', 0.82, 0.88, 0.92, 0.94, 0.94, 0.94, 0.94, 0.94, 0.8, 0.9),
    T('editorial', 'Editorial', 1.3, 1.15, 1.05, 1.08, 1, 1, 1, 1, 1.15, 1),
    T('quiet', 'Quiet', 0.78, 0.84, 0.9, 0.96, 1, 0.96, 0.96, 0.96, 0.7, 0.88),
    T('poster', 'Poster', 1.6, 1.3, 1.1, 1.1, 1.02, 1, 1, 1, 1.5, 1.1)
  ];

  function pal(id) {
    for (var i = 0; i < palettes.length; i++) {
      if (palettes[i].id === id) return JSON.parse(JSON.stringify({ dark: palettes[i].dark, light: palettes[i].light }));
    }
    return null;
  }
  function pair(id) {
    for (var i = 0; i < pairings.length; i++) {
      if (pairings[i].id === id) {
        var p = pairings[i];
        return { display: p.display, body: p.body, mono: p.mono, displayWeight: p.displayWeight, bodyWeight: p.bodyWeight };
      }
    }
    return {};
  }
  function scale(id) {
    for (var i = 0; i < typeScales.length; i++) if (typeScales[i].id === id) return JSON.parse(JSON.stringify(typeScales[i].size));
    return {};
  }
  function merge(a, b) { for (var k in b) a[k] = b[k]; return a; }
  function look(id, name, note, o) {
    var type = merge(pair(o.pair), { size: scale(o.scale) });
    if (o.type) merge(type, o.type);
    var cfg = { colors: pal(o.pal), type: type, layout: o.layout || {}, motion: o.motion || {}, logo: o.logo || {} };
    return { id: id, name: name, note: note, config: cfg };
  }

  var looks = [
    look('original', 'Original', 'The shipped Aurora Lines look.', {
      pal: 'aurora', pair: 'original', scale: 'default',
      layout: { maxWidth: 1280, radius: 14, heroAlign: 'left', heroV: 'center', nav: 'bar', work: 'grid2' },
      motion: { level: 'full', cursor: 'comet', reveal: 'rise', revealDistance: 24 },
      logo: { mark: 'peak', size: 1, showName: true }
    }),
    look('gallery', 'Gallery', 'Quiet glacier light, centred, generous space.', {
      pal: 'glacier', pair: 'gallery', scale: 'quiet',
      type: { lineHeight: { display: 1.02, body: 1.65 }, tracking: { display: 0, body: 0, mono: 0.04 } },
      layout: { maxWidth: 1180, pad: 1.2, sectionGap: 1.3, radius: 4, heroAlign: 'center', heroV: 'center', nav: 'minimal', navAlign: 'center', work: 'grid3' },
      motion: { level: 'calm', cursor: 'ring', cursorColor: 2, reveal: 'fade', revealDistance: 10, heroDrift: 0.5 },
      logo: { mark: 'serif', size: 1, showName: false }
    }),
    look('terminal', 'Terminal', 'Boreal green, mono-forward, list layout.', {
      pal: 'boreal', pair: 'techno', scale: 'compact',
      type: { eyebrowCase: 'upper', tracking: { display: -0.01, body: 0, mono: 0.06 }, displayItalicAccent: false },
      layout: { maxWidth: 1100, radius: 2, heroAlign: 'left', heroV: 'bottom', nav: 'bar', work: 'list' },
      motion: { level: 'full', cursor: 'dots', cursorColor: 1, reveal: 'fade', revealDistance: 8, transition: 'fade' },
      logo: { mark: 'monogram', size: 1, showName: true }
    }),
    look('magazine', 'Magazine', 'Rose quartz, big serif, feature work layout.', {
      pal: 'rose', pair: 'magazine', scale: 'editorial',
      type: { lineHeight: { display: 0.98, body: 1.55 }, eyebrowCase: 'upper' },
      layout: { maxWidth: 1360, radius: 0, heroAlign: 'left', heroV: 'bottom', heroHeight: 100, nav: 'bar', work: 'feature' },
      motion: { level: 'full', cursor: 'spotlight', cursorColor: 1, reveal: 'rise', revealDistance: 32 },
      logo: { mark: 'wordmark', size: 1, showName: true }
    }),
    look('minimal', 'Minimal', 'Paper and ink, nothing moves much.', {
      pal: 'paper', pair: 'caslon', scale: 'quiet',
      layout: { maxWidth: 1100, pad: 1.1, sectionGap: 1.2, radius: 0, heroAlign: 'left', heroV: 'center', nav: 'minimal', navAlign: 'right', work: 'list', launcher: 'br' },
      motion: { level: 'calm', cursor: 'none', reveal: 'fade', revealDistance: 8, heroDrift: 0.3, kinetic: { on: true, speed: 0.6, ticker: false } },
      logo: { mark: 'serif', size: 0.9, showName: false }
    }),
    look('nightdrive', 'Night drive', 'Neon arcade, fast kinetic band, comet trail.', {
      pal: 'neon', pair: 'wide', scale: 'poster',
      layout: { maxWidth: 1400, radius: 8, heroAlign: 'left', heroV: 'center', heroHeight: 100, nav: 'floating', work: 'grid2' },
      motion: { level: 'full', heroDensity: 1.3, heroDrift: 1.4, cursor: 'sparks', cursorColor: 1, reveal: 'scale', revealDistance: 24, kinetic: { on: true, speed: 1.8, direction: 'left', separator: '✦', ticker: true }, transition: 'aurora-wipe' },
      logo: { mark: 'ridge', size: 1.1, showName: true }
    }),
    look('fieldnotes', 'Field notes', 'Sepia print, bookish serif, tactile and calm.', {
      pal: 'sepia', pair: 'bookish', scale: 'default',
      type: { lineHeight: { display: 1.05, body: 1.7 }, eyebrowCase: 'none' },
      layout: { maxWidth: 1160, radius: 6, heroAlign: 'left', heroV: 'center', nav: 'bar', work: 'grid2' },
      motion: { level: 'calm', cursor: 'ring', cursorColor: 0, reveal: 'rise', revealDistance: 14, heroDrift: 0.6, kinetic: { on: true, speed: 0.7, separator: '/', ticker: true } },
      logo: { mark: 'ribbon', size: 1, showName: true }
    }),
    look('poster', 'Poster', 'Solar flare, giant type, loud and graphic.', {
      pal: 'solar', pair: 'poster', scale: 'poster',
      type: { lineHeight: { display: 0.92, body: 1.5 }, tracking: { display: -0.03, body: 0, mono: 0.02 }, displayItalicAccent: false },
      layout: { maxWidth: 1500, pad: 0.9, radius: 0, heroAlign: 'left', heroV: 'bottom', heroHeight: 105, heroTextWidth: 30, nav: 'floating', work: 'feature' },
      motion: { level: 'full', heroDensity: 1.2, cursor: 'spotlight', cursorColor: 0, reveal: 'scale', revealDistance: 30, kinetic: { on: true, speed: 1.6, separator: '●', ticker: true } },
      logo: { mark: 'monogram', size: 1.1, showName: false }
    })
  ];

  function fontUrl(family, weights, italic) {
    var ws = (weights && weights.length ? weights.slice() : [400]).sort(function (a, b) { return a - b; });
    var fam = encodeURIComponent(family).replace(/%20/g, '+');
    var spec, i;
    if (italic) {
      var parts = [];
      for (i = 0; i < ws.length; i++) parts.push('0,' + ws[i]);
      for (i = 0; i < ws.length; i++) parts.push('1,' + ws[i]);
      spec = ':ital,wght@' + parts.join(';');
    } else {
      spec = ':wght@' + ws.join(';');
    }
    return 'https://fonts.googleapis.com/css2?family=' + fam + spec + '&display=swap';
  }

  window.RM_PRESETS = { palettes: palettes, fonts: fonts, pairings: pairings, typeScales: typeScales, looks: looks, fontUrl: fontUrl };
})();
