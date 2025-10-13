// Wrapper around sass to suppress legacy-js-api deprecation warnings
// Should be removed when sass-preprocessor is upgraded to the version that works with modern sass api
const sass = require('sass');

// Capture original stderr.write
const originalStderrWrite = process.stderr.write.bind(process.stderr);

// Override stderr.write to filter out sass deprecation warnings
process.stderr.write = (chunk, encoding, callback) => {
  if (typeof chunk === 'string' && chunk.includes('DEPRECATION WARNING [legacy-js-api]')) {
    // Suppress the warning
    if (typeof encoding === 'function') {
      encoding();
    } else if (typeof callback === 'function') {
      callback();
    }
    return true;
  }
  return originalStderrWrite(chunk, encoding, callback);
};

module.exports = sass;
