const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'token.json';

async function authorize() {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // check if we have a previous token
    try {
        const token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    } catch (error) {
        return getNewToken(oAuth2Client);
    }
}

async function getNewToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    
    console.log('Authorize this app by visiting this url:', authUrl);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    return new Promise((resolve, reject) => {
      rl.question('Enter code from URL: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return reject(err);
          oAuth2Client.setCredentials(token);
          // Store the token to disk for later program executions
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
          console.log('Token stored to', TOKEN_PATH);
          resolve(oAuth2Client);
      });
    });
  });
}

module.exports = {
    authorize,
}