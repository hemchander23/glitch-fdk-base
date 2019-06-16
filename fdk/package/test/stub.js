'use strict';

module.exports = {
  stubModule(module, stubbedProperties) {
    delete require.cache[require.resolve(module)];

    require(module);
    require.cache[require.resolve(module)].exports = stubbedProperties;
  },

  releaseStub(module) {
    delete require.cache[require.resolve(module)];
  }
};