require('dotenv').load();
const openBrowser = require('react-dev-utils/openBrowser');

const appId = process.env.FB_APP_ID;
if (!(appId && appId.length)) {
  throw Error('FB_APP_ID environment variable not found.');
}

const port = process.env.PORT || '8000';
const localUrl = 'https://localhost:' + port;
const embedUrl = 'https://www.facebook.com/embed/instantgames/';
const facebookAppUrl = embedUrl + appId + '/player?game_url=' + localUrl;

console.log('Facebook will expect the app to be running at', localUrl);
console.log('Opening' , facebookAppUrl);
console.log('Since the app is running with HTTPS you might need to visit',
  localUrl,
  'first and approve the certificates'
);
openBrowser(facebookAppUrl);
