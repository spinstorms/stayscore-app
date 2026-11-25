// Reads app.json; lets CI build a single-page web version for screen mock-ups (EXPO_WEB_OUTPUT=single).
module.exports = ({ config }) => ({
  ...config,
  web: { ...config.web, output: process.env.EXPO_WEB_OUTPUT || config.web?.output },
});
