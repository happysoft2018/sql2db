const path = require('path');

function getAppRoot() {
  // When packaged by pkg, use the executable directory; otherwise, project root
  // This module lives in src/modules, so project root is two levels up from __dirname
  if (process.pkg) {
    return path.dirname(process.execPath);
  }
  return path.join(__dirname, '..', '..');
}

module.exports = {
  getAppRoot,
};
