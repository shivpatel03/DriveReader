const { google } = require('googleapis');
const { extractText } = require('./text-conversions/read-text');
const { authorize } = require('./auth/authorize');

async function main() {
  // authorize the app
  const auth = await authorize();

  // create hashset of file types that we can process (skip otherwise)
  const fileTypes = new Set(['application/pdf', 'application/vnd.google-apps.document', 'application/vnd.google-apps.spreadsheet', 'application/vnd.google-apps.presentation', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']);

  // get drive api client
  const drive = google.drive({ version: 'v3', auth });

  // get files in the drive
  const res = await drive.files.list({
    pageSize: 100,
    fields: 'nextPageToken, files(id, name, webViewLink, mimeType, kind)'
  })
  const files = res.data.files;

  // process files (convert to text)
  if (files.length !== 0) {
    files.forEach((file) => {
      if (fileTypes.has(file.mimeType)) {
        extractText(drive, file.id)
      } else {
        console.log(`❌ Skipping file ${file.name} because it is not a supported file type`);
      }
    })
  } else {
    console.log('❌ No Files Found');
  }
}

main().catch(console.error);
