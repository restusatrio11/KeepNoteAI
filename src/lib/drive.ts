import { google } from 'googleapis';
import { Readable } from 'stream';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decryptSecret } from '@/lib/portal/crypto';

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
];

type DriveClient = ReturnType<typeof google.drive>;

export function buildOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/drive/callback';
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET belum di-set di .env');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(state: string) {
  return buildOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCode(code: string) {
  const client = buildOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getUserEmail(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return (data.email as string) || '';
}

export async function getDriveClientFromTokens(accessToken?: string, refreshToken?: string) {
  const client = buildOAuthClient();
  client.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken || undefined,
  });
  return google.drive({ version: 'v3', auth: client });
}

export async function getDriveClientForUser(userId: string): Promise<DriveClient> {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (!settings?.driveRefreshToken) {
    throw new Error('Google Drive belum dihubungkan untuk user ini');
  }

  const refreshToken = decryptSecret(settings.driveRefreshToken);
  const accessToken = settings.driveAccessToken ? decryptSecret(settings.driveAccessToken) : undefined;
  return getDriveClientFromTokens(accessToken, refreshToken);
}

export async function createFolder(name: string, drive: DriveClient) {
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });
  return response.data.id;
}

export async function uploadToDrive(
  file: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string,
  drive: DriveClient
) {
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(file),
    },
    fields: 'id, webViewLink',
  });

  return {
    id: response.data.id,
    link: response.data.webViewLink,
  };
}

export async function getFileBuffer(fileId: string, drive: DriveClient): Promise<Buffer> {
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(response.data as ArrayBuffer);
}

export function extractFileIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}
