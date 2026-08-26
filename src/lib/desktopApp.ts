// URL unduhan aplikasi desktop KeepNoteAI.
// Bisa dioverride via env NEXT_PUBLIC_DESKTOP_APP_URL (mis. ganti file Google Drive).
export const DESKTOP_APP_URL =
  process.env.NEXT_PUBLIC_DESKTOP_APP_URL ||
  'https://drive.google.com/uc?export=download&id=1LLxMdMqFIOrc-NO7LzuzSlmGleoHcXjf';
