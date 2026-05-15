const path = require("path");
 
module.exports = function (api) {
  api.cache(true);
 
  const isTest = process.env.NODE_ENV === "test";
 
  if (isTest) {
    // En tests: usamos babel-preset-expo pero sobreescribimos
    // el módulo de worklets con un stub vacío antes de que
    // babel-preset-expo intente cargarlo
    require.resolve = (function (originalResolve) {
      return function (id, options) {
        if (id === "react-native-worklets/plugin") {
          return path.resolve(__dirname, "jest.mocks/react-native-worklets/plugin.js");
        }
        return originalResolve(id, options);
      };
    })(require.resolve);
  }
 
  return {
    presets: ["babel-preset-expo"],
  };
};