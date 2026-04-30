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
  // In Playroom v1 webpackConfig is a no-arg factory — it returns additional
  // rules that are merged (by test match) into Playroom's internal config.
  // Playroom's own CSS rule carries issuer: /node_modules\/playroom/ so it only
  // fires for CSS imported by Playroom's internals (codemirror themes etc.).
  // Our rules below cover the remaining cases without overlap.
  webpackConfig: () => ({
    module: {
      rules: [
        // TypeScript + JSX — handles our .tsx/.ts/.jsx files (FrameComponent, generated components).
        // Playroom's internal Babel loader uses `include: includePaths` scoped to playroom's own
        // source, so our files outside node_modules/playroom are left without a loader otherwise.
        {
          test: /\.(tsx?|jsx)$/,
          exclude: /node_modules/,
          use: [{
            loader: require.resolve('babel-loader'),
            options: {
              presets: [
                [require.resolve('@babel/preset-env'), { shippedProposals: true }],
                [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
                require.resolve('@babel/preset-typescript'),
              ],
            },
          }],
        },
        // CSS modules — component .module.css files need PostCSS for rem() transforms.
        {
          test: /\.module\.css$/,
          use: [
            require.resolve('style-loader'),
            { loader: require.resolve('css-loader'), options: { modules: true } },
            require.resolve('postcss-loader'),
          ],
        },
        // Plain CSS from our code (FrameComponent → @mantine/core/styles.css).
        // issuer guard prevents this rule firing for CSS Playroom's own code imports
        // (codemirror themes etc.) — those are already handled by Playroom's rule.
        {
          test: /\.css$/,
          exclude: /\.module\.css$/,
          issuer: { not: /node_modules\/playroom/ },
          use: [
            require.resolve('style-loader'),
            require.resolve('css-loader'),
          ],
        },
      ],
    },
  }),
};
