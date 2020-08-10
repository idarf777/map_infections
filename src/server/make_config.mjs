import makeConfig from "./config.mjs";
global.covid19map = { config: makeConfig() };
export const config = global.covid19map.config;

