// Playroom uses MiniCssExtractPlugin internally — we reference the same loader
// so both our CSS rules and Playroom's are consistent in the same compilation.
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/** @type {import('playroom').Config} */
module.exports = {
  components: './playroom/components.js',
  outputPath: './dist/playroom',
  frameComponent: './playroom/FrameComponent.jsx',

  // Viewport widths shown in the multi-width preview bar
  widths: [320, 768, 1280],
  port: 9000,
  openBrowser: false,

  // ── Storage ────────────────────────────────────────────────────────────────
  // Explicit key so all users share a clean state. Bump the version suffix
  // whenever you want to reset stored Playroom sessions (e.g. after a major
  // component rename or breaking scope change).
  storageKey: 'mantine-architect-v1',

  // ── Example code ───────────────────────────────────────────────────────────
  // Shown in the code panel for new sessions (no stored state).
  // Demonstrates the available scope: generated components, Mantine primitives,
  // and Tabler icons — all importable by name without any import statements.
  exampleCode: `
<Stack p="md" gap="md">
  <Text fw={600} size="lg">Hello Playroom</Text>
  <Text size="sm" c="gray.7">
    All generated components and Mantine primitives are in scope — no imports needed.
  </Text>
  <Group>
    <ButtonMenu
      label="Create new"
      items={defaultItems}
    />
    <Badge>Active</Badge>
  </Group>
</Stack>
  `.trim(),


  // ── Webpack CSS fixes ──────────────────────────────────────────────────────
  // In Playroom v1 webpackConfig is a no-arg factory — it returns additional
  // rules that are merged (by test match) into Playroom's internal config.
  // Playroom's own CSS rule carries issuer: /node_modules\/playroom/ so it only
  // fires for CSS imported by Playroom's internals (codemirror themes etc.).
  // Our rules below cover the remaining cases without overlap.
  //
  // We use MiniCssExtractPlugin.loader (not style-loader) to stay consistent
  // with Playroom's own CSS pipeline. style-loader@4 does not reliably
  // re-export CSS module locals (.default) when used alongside MiniCssExtractPlugin
  // in the same compilation, causing `classes.foo` to be undefined at runtime.
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
        // MiniCssExtractPlugin.loader is already in Playroom's plugin list; using it
        // here keeps both pipelines consistent and correctly exports module locals.
        // namedExport: false — css-loader v7 defaults to named-only exports; our
        // components use `import classes from './Foo.module.css'` (default import),
        // so we need the traditional `export default { root: 'hash', ... }` form.
        {
          test: /\.module\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: require.resolve('css-loader'),
              options: { modules: { namedExport: false } },
            },
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
            MiniCssExtractPlugin.loader,
            require.resolve('css-loader'),
          ],
        },
      ],
    },
  }),
};
