'use strict';

/**
 * InMemory Data store is mostly used to store the state information
 * This will abstract the storage of the state in business logic
 */
class InMemoryDataStore {
  constructor() {
    this.store = {};
  }

  get(key) {
    return this.store[key];
  }

  set(key, value) {
    this.store[key] = value;

    return this;
  }

  getOrDefault(key, defaultValue) {
    return this.get(key) || defaultValue;
  }

  remove(key) {
    delete this.store[key];

    return this;
  }

  check(key, expectedValue) {
    return this.get(key) === expectedValue;
  }
}

module.exports = InMemoryDataStore;
