import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

let storedTokens: {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
} | null = null;

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/google/callback`
  );
}

export function getAuthUrl() {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function handleCallback(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  storedTokens = {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    expiry_date: tokens.expiry_date || Date.now() + 3600000,
  };
  return tokens;
}

export function getAuthenticatedClient() {
  if (!storedTokens) return null;
  const client = getOAuth2Client();
  client.setCredentials(storedTokens);
  return client;
}

export function isConnected() {
  return storedTokens !== null;
}

export function disconnect() {
  storedTokens = null;
}
