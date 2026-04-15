import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

export async function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN is missing in .env');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function createFolder(name: string) {
  const drive = await getDriveClient();
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });
  return response.data.id;
}

export async function shareFile(fileId: string, email: string) {
  const drive = await getDriveClient();
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'writer',
      type: 'user',
      emailAddress: email,
    },
  });
}

export async function uploadToDrive(file: Buffer, fileName: string, mimeType: string, folderId: string) {
  const drive = await getDriveClient();

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType,
      body: Readable.from(file),
    },
    fields: 'id, webViewLink',
  });

  // Make the file publicly viewable if needed
  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return {
    id: response.data.id,
    link: response.data.webViewLink,
  };
}

export async function getFileBuffer(fileId: string): Promise<Buffer> {
  const drive = await getDriveClient();
  const response = await drive.files.get({
    fileId,
    alt: 'media',
  }, { responseType: 'arraybuffer' });
  
  return Buffer.from(response.data as ArrayBuffer);
}

export function extractFileIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  // Handle webViewLink format: https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

