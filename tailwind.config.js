module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  purge: {
    mode: "layers",
    layers: ["base", "components", "utilities"],
    content: ["src/**/*.html", "src/**/*.tsx"],
  },
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [],
};
