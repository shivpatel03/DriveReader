const { google } = require('googleapis');
const { extractText } = require('./text-conversions/read-text');
const { authorize } = require('./auth/authorize');

async function main() {
  // authorize the app
  const auth = await authorize();

  // get drive api client
  const drive = google.drive({ version: 'v3', auth });

  // get files in the drive
  const res = await drive.files.list({
    pageSize: 10,
    q: "mimeType='application/vnd.google-apps.document'",
    fields: 'nextPageToken, files(id, name, webViewLink, mimeType, kind)'
  })
  const files = res.data.files;

  // process files (convert to text)
  if (files.length !== 0) {
    files.forEach((file) => {
      extractText(drive, file.id)
    })
  } else {
    console.log('❌ No Files Found');
  }
}

main().catch(console.error);
