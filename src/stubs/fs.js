/** Browser stand-in. Piper's emscripten bundle references Node's fs only in the Node branch. */
module.exports = {
  readFile(_path, callback) {
    callback(new Error('fs is not available in the browser'));
  },
  readFileSync() {
    return new Uint8Array();
  },
  promises: {
    async readFile() {
      return new Uint8Array();
    },
  },
};
