import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Gmail API Configuration and OAuth2 Client Setup
 */

// OAuth2 credentials from environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${process.env.PORT || 3001}/api/auth/callback`;

console.log('🔧 Debug - Environment variables loaded:');
console.log('CLIENT_ID:', CLIENT_ID ? 'Present' : 'Missing');
console.log('CLIENT_SECRET:', CLIENT_SECRET ? 'Present' : 'Missing');
console.log('REDIRECT_URI:', REDIRECT_URI);

// OAuth2 scopes required for Gmail access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

/**
 * Create OAuth2 client instance
 */
function createOAuth2Client() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn('⚠️ Google OAuth2 credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
    return null;
  }

  return new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );
}

/**
 * Generate OAuth2 authorization URL
 */
function getAuthUrl() {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    throw new Error('OAuth2 client not configured');
  }
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
    redirect_uri: REDIRECT_URI // Explicitly set redirect URI
  });
  
  console.log('🔧 Generated Auth URL:', authUrl);
  console.log('🔧 Redirect URI being used:', REDIRECT_URI);
  
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
async function getTokensFromCode(code) {
  try {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      throw new Error('OAuth2 client not configured');
    }
    
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('❌ Error getting tokens from code:', error.message);
    throw new Error('Failed to exchange authorization code for tokens');
  }
}

/**
 * Create authenticated Gmail client
 */
function createGmailClient(accessToken, refreshToken) {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    throw new Error('OAuth2 client not configured');
  }
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken) {
  try {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      throw new Error('OAuth2 client not configured');
    }
    
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('❌ Error refreshing access token:', error.message);
    throw new Error('Failed to refresh access token');
  }
}

/**
 * Fetch Gmail messages with pagination
 */
async function fetchMessages(gmail, options = {}) {
  try {
    const {
      query = '',
      maxResults = 50,
      pageToken = null,
      labelIds = null
    } = options;

    const params = {
      userId: 'me',
      maxResults,
      q: query
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    if (labelIds && labelIds.length > 0) {
      params.labelIds = labelIds;
    }

    const response = await gmail.users.messages.list(params);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching messages:', error.message);
    throw new Error('Failed to fetch Gmail messages');
  }
}

/**
 * Get detailed message information
 */
async function getMessageDetails(gmail, messageId) {
  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error getting message details:', error.message);
    throw new Error(`Failed to get message details for ID: ${messageId}`);
  }
}

/**
 * Get user's Gmail labels
 */
async function getLabels(gmail) {
  try {
    const response = await gmail.users.labels.list({
      userId: 'me'
    });

    return response.data.labels || [];
  } catch (error) {
    console.error('❌ Error getting labels:', error.message);
    throw new Error('Failed to fetch Gmail labels');
  }
}

/**
 * Get user profile information
 */
async function getUserProfile(accessToken) {
  try {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      throw new Error('OAuth2 client not configured');
    }
    
    oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const response = await oauth2.userinfo.get();

    return response.data;
  } catch (error) {
    console.error('❌ Error getting user profile:', error.message);
    throw new Error('Failed to get user profile');
  }
}

export {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  createGmailClient,
  refreshAccessToken,
  fetchMessages,
  getMessageDetails,
  getLabels,
  getUserProfile,
  SCOPES
};