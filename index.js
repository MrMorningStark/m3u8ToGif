const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');

// Public folder where GIFs will be saved
const publicFolder = path.join(__dirname, 'public');

// Ensure public folder exists
fs.ensureDirSync(publicFolder);

const safeRename = (tempPath, finalPath) => {
  // Check if the final file already exists
  if (fs.existsSync(finalPath)) {
    try {
      // Remove the final file before renaming
      fs.unlinkSync(finalPath);
    } catch (err) {
      console.error(`Error deleting file ${finalPath}: ${err.message}`);
      return;
    }
  }
  try {
    fs.renameSync(tempPath, finalPath);
  } catch (err) {
    console.error(`Error renaming file from ${tempPath} to ${finalPath}: ${err.message}`);
  }
};
// Function to convert m3u8 to GIF and use temp file
const convertM3u8ToGif = async (inputUrl, gifPathTemp, gifPathFinal, duration) => {

  return new Promise((resolve, reject) => {
    ffmpeg(inputUrl)
      .setStartTime(0) // Start at the beginning of the video
      .duration(duration) // Duration of GIF
      // Use a filter to resize the output GIF and adjust the frame rate for compression
      .outputOptions([
        '-vf', 'fps=10,scale=320:-1:flags=lanczos',
        '-pix_fmt', 'rgb24',
        '-compression_level', '100',
        '-movflags', 'faststart',
      ])
      .output(gifPathTemp)
      .on('end', () => {
        // Rename the temp file to the final file
        safeRename(gifPathTemp, gifPathFinal);
        resolve('GIF created successfully');
      })
      .on('error', (err) => {
        console.error('Error creating GIF:', err); // Log the error for better debugging
        reject(err);
      })
      .run();
  });
}


// Function to process multiple m3u8 URLs
const processM3u8Array = async (m3u8Urls, duration) => {
  for (let i = 0; i < m3u8Urls.length; i++) {
    const m3u8Url = m3u8Urls[i];
    const gifPathTemp = path.join(publicFolder, `video_${i + 1}_temp.gif`);
    const gifPathFinal = path.join(publicFolder, `video_${i + 1}.gif`);

    //if gifPathTemp is exis then delete
    if (fs.existsSync(gifPathTemp)) {
      fs.unlinkSync(gifPathTemp);
      console.log('Deleted temp file: ' + gifPathTemp);
    }

    try {
      console.log('Processing: ' + i);
      await convertM3u8ToGif(m3u8Url, gifPathTemp, gifPathFinal, duration);
      console.log('Processed: ' + i);
    } catch (err) {
      console.error(`Failed to convert: ${i}: ${err.message}`);
      if (fs.existsSync(gifPathTemp)) {
        fs.unlinkSync(gifPathTemp);
        console.log('Deleted temp file: ' + gifPathTemp);
      }
    } finally {
      if (i == m3u8Urls.length - 1) {
        console.log('All m3u8 URLs processed');
        console.log('Looping again...');
        main();
      }
    }
  }
};

// Main function with hardcoded URLs and duration
const main = async () => {
  const m3u8Urls = [
    'https://vg-theqlive.akamaized.net/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/vglive-sk-306905/main.m3u8',
    'https://janya-rdcmovies.akamaized.net/ptnr-Qplay+/title-RDC_Movies_New/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/230a723f-867d-4fa3-b2d2-a622ba994cd2/main.m3u8',
    'https://janya-qtoonz.akamaized.net/ptnr-Qplay+/title-Q_Toonz_New/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/fe1720c6-2efd-48ad-b61f-a3edaed6130b/main.m3u8',
    'https://vg-theqlive.akamaized.net/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/vglive-sk-420342/main.m3u8?ads.partner=qplayapp',
    'https://vg-theqlive.akamaized.net/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/vglive-sk-640586/main.m3u8?ads.partner=qplayapp',

    // Add more URLs as needed
  ];
  const duration = 20; // Hardcoded GIF duration in seconds
  processM3u8Array(m3u8Urls, duration);
};



// Create and run Express server
const app = express();
app.use(express.static(publicFolder));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  main(); // Start updating GIFs when server starts
});
