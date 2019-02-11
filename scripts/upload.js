require('dotenv').load();
const fs = require('fs');
const request = require('request');
const archiver = require('archiver');
const openBrowser = require('react-dev-utils/openBrowser');

const appId = process.env.FB_APP_ID;
if (!(appId && appId.length)) {
  throw Error('FB_APP_ID environment variable not found.');
}

const uploadAccessToken = process.env.FB_UPLOAD_ACCESS_TOKEN;
if (!(uploadAccessToken && uploadAccessToken.length)) {
  throw Error('FB_UPLOAD_ACCESS_TOKEN environment variable not found.');
}

function archiveDirectory(inputDir, outputFilepath) {
  return new Promise(function(resolve, reject) {
    // create a file to stream archive data to.
    var output = fs.createWriteStream(outputFilepath);
    var archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on('close', function() {
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');

      resolve();
    });

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on('end', function() {
      console.log('Data has been drained');
    });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        console.warn(err);
      } else {
        throw err;
      }
    });

    // good practice to catch this error explicitly
    archive.on('error', function(err) {
      throw err;
    });

    // pipe archive data to the file
    archive.pipe(output);

    // append files from a sub-directory, putting its contents at the root of archive
    archive.directory(inputDir + '/', false);

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
    archive.finalize();
  });
}

function uploadAsset(filename, filepath) {
  return new Promise(function(resolve, reject) {
    var absFilepath = process.cwd() + '/' + filepath;
    console.log('Uploading archive:', filepath);
    console.log('Absolute path:', absFilepath);

    request.post({
      url: 'https://graph-video.facebook.com/' + appId + '/assets',
      formData: {
        'access_token' : uploadAccessToken,
        'type': 'BUNDLE',
        'comment': 'Uploaded via facebook-dev-scripts',
        'asset': {
          value: fs.createReadStream(absFilepath),
          options: {
            filename: filename,
            contentType: 'application/octet-stream'
          }
        }
      }
    }, function(error, response, body) {
      if (error) {
        throw err;
      }

      if (!body) {
        throw Error('Upload failed. Nothing was returned.');
      }

      try {
        var body = JSON.parse(response.body);
        if (body.success) {
          console.log('Bundle uploaded via the graph API');
          console.log('Don\'t forget you need to publish the build');
          console.log('Opening developer dashboard...');
          openBrowser('https://developers.facebook.com/apps/' + appId + '/instant-games/hosting/')
          resolve();
        } else {
          reject('Upload failed. Unexpected Graph API response: ' + response.body);
        }
      } catch (e) {
        reject('Upload failed. Invalid response response: ' + response.body);
      }
    });
  });
}

function run() {
  const buildDir = 'build';
  const archivesDir = 'archives';
  const filename = Date.now() + '.zip';
  const filepath = archivesDir + '/' + filename;

  if (!fs.existsSync(archivesDir)) {
    fs.mkdirSync(archivesDir);
  }

  archiveDirectory(buildDir, filepath).then(function() {
    uploadAsset(filename, filepath).then(function() {
      console.log('Success!');
    }).catch(function(error) {
      console.error(error);
    });
  });
}

run();
