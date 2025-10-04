const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

const validateAudioFile = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error('Invalid audio file'));
        return;
      }

      const duration = metadata.format.duration;
      const size = metadata.format.size;

      // Check duration (5 minutes = 300 seconds)
      if (duration > 300) {
        reject(new Error('Audio duration cannot exceed 5 minutes'));
        return;
      }

      // Check file size (100MB = 100 * 1024 * 1024 bytes)
      if (size > 100 * 1024 * 1024) {
        reject(new Error('Audio file size cannot exceed 100MB'));
        return;
      }

      resolve({
        duration: Math.round(duration),
        size: size,
        mimeType: metadata.format.format_name
      });
    });
  });
};

module.exports = { validateAudioFile };
