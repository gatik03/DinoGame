'use strict';

class NeonModelLoader {
  constructor() {
    this.loaderPromise = null;
  }

  async _getLoader() {
    if (!this.loaderPromise) {
      this.loaderPromise = import(
        '/vendor/three/examples/jsm/loaders/GLTFLoader.js'
      ).then(({ GLTFLoader }) => new GLTFLoader());
    }
    return this.loaderPromise;
  }

  async load(url) {
    const loader = await this._getLoader();
    return new Promise((resolve, reject) => {
      loader.load(url, (result) => resolve(result), undefined, reject);
    });
  }
}

window.NeonModelLoader = NeonModelLoader;
