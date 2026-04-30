/** @type {import('playroom').Config} */
module.exports = {
  components: './playroom/components.js',
  outputPath: './dist/playroom',
  frameComponent: './playroom/FrameComponent.jsx',

  // Viewport widths shown in the multi-width preview bar
  widths: [320, 768, 1280],
  port: 9000,
  openBrowser: false,

  // ── Mantine displayName fix ────────────────────────────────────────────────
  // All Mantine components carry displayName: '@mantine/core/ComponentName',
  // which produces invalid JSX in the code panel.
  // Strip the '@scope/package/' prefix to get clean component names.
  reactElementToJSXStringOptions: {
    displayName: (element) => {
      const type = element.type;
      if (typeof type === 'string') return type;
      const raw = (type && (type.displayName || type.name)) || 'Unknown';
      return raw.replace(/^@[\w-]+\/[\w-]+\//, '');
    },
  },

  // ── Webpack CSS fixes ──────────────────────────────────────────────────────
  webpackConfig: (config) => {
    // Exclude .module.css from Playroom's built-in CSS rules so our rule below
    // handles them exclusively (prevents double-processing).
    config.module.rules = config.module.rules.map((rule) => {
      if (rule.test && rule.test.toString().includes('css')) {
        const existing = rule.exclude ? [].concat(rule.exclude) : [];
        return { ...rule, exclude: [...existing, /\.module\.css$/] };
      }
      return rule;
    });

    // CSS modules — component .module.css files need PostCSS for rem() transforms.
    config.module.rules.push({
      test: /\.module\.css$/,
      use: [
        require.resolve('style-loader'),
        { loader: require.resolve('css-loader'), options: { modules: true } },
        require.resolve('postcss-loader'),
      ],
    });

    // Plain CSS imported by our code (e.g. FrameComponent → @mantine/core/styles.css).
    // issuer guard: only fires for CSS our code imports, not CSS Playroom's own
    // internals import (e.g. codemirror theme files) — prevents double-processing.
    config.module.rules.push({
      test: /\.css$/,
      exclude: /\.module\.css$/,
      issuer: { not: /node_modules\/playroom/ },
      use: [
        require.resolve('style-loader'),
        require.resolve('css-loader'),
      ],
    });

    return config;
  },
};
