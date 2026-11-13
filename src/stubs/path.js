/** Browser stand-in for the Node path import inside the Piper bundle. */
module.exports = {
  dirname() {
    return '';
  },
  join(...parts) {
    return parts.join('/');
  },
};
