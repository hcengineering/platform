// Wrapper around sass to suppress legacy-js-api deprecation warnings
// Should be removed when sass-preprocessor is upgraded to the version that works with modern sass api

// Install the stderr filter globally as early as possible
if (!process.stderr._originalWrite) {
  process.stderr._originalWrite = process.stderr.write;
  
  process.stderr.write = function (chunk, encoding, callback) {
    const chunkStr = typeof chunk === 'string' ? chunk : (chunk?.toString?.() || '');
    
    // Filter out sass legacy API deprecation warnings
    if (chunkStr.includes('Deprecation Warning [legacy-js-api]') || 
        chunkStr.includes('DEPRECATION WARNING [legacy-js-api]') ||
        chunkStr.includes('The legacy JS API is deprecated') ||
        chunkStr.includes('More info: https://sass-lang.com/d/legacy-js-api')) {
      // Suppress the warning - just call the callback
      if (typeof encoding === 'function') {
        encoding();
      } else if (typeof callback === 'function') {
        callback();
      }
      return true;
    }
    
    return process.stderr._originalWrite.call(this, chunk, encoding, callback);
  };
}

const sass = require('sass');

module.exports = sass;
