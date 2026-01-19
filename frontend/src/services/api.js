import axios from 'axios'

/**
 * API Service
 * Centralized HTTP client for backend communication
 */

// Create axios instance with default configuration
const api = axios.create({
  // Production: Use backend URL, Development: Use proxy
  baseURL: window.location.hostname.includes('onrender.com')
    ? 'https://smartmail-w4ff.onrender.com/api'
    : '/api',
  timeout: 60000, // Increased to 60 seconds for Gmail sync
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for session management
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartmail_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('smartmail_token')
      localStorage.removeItem('smartmail_user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

/**
 * Authentication API methods
 */
export const authAPI = {
  // Get current user status
  getStatus: () => api.get('/auth/status'),
  
  // Initiate Google OAuth
  googleLogin: () => {
    // Direct backend URL for production
    const backendURL = window.location.hostname.includes('onrender.com')
      ? 'https://smartmail-w4ff.onrender.com'
      : 'http://localhost:3001'
    window.location.href = `${backendURL}/api/auth/google`
  },
  
  // Logout user
  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.warn('Logout API error:', error)
    } finally {
      localStorage.removeItem('smartmail_token')
      localStorage.removeItem('smartmail_user')
    }
  }
}

/**
 * User API methods
 */
export const userAPI = {
  // Get current user profile
  getProfile: () => api.get('/user/profile'),
  
  // Update user preferences
  updatePreferences: (preferences) => api.put('/user/preferences', { preferences }),
  
  // Get user statistics
  getStats: () => api.get('/user/stats')
}

/**
 * Mail API methods
 */
export const mailAPI = {
  // Get emails with pagination and filters
  getEmails: (params = {}) => api.get('/mail', { params }),
  
  // Get specific email by ID
  getEmail: (messageId) => api.get(`/mail/${messageId}`),
  
  // Incremental sync using Gmail History API (QUOTA EFFICIENT)
  incrementalSync: () => api.post('/sync/incremental'),
  
  // Get sync status (rate limit, last sync time)
  getSyncStatus: () => api.get('/sync/status'),
  
  // Clear rate limit (debug)
  clearRateLimit: () => api.post('/sync/clear-rate-limit'),
  
  // Get sent emails from Gmail
  getSentEmails: (params = {}) => api.get('/mail/sent', { params }),
  
  // Get starred emails from Gmail
  getStarredEmails: (params = {}) => api.get('/mail/starred', { params }),
  
  // Get trash emails from Gmail
  getTrashEmails: (params = {}) => api.get('/mail/trash', { params }),
  
  // Get archived emails from Gmail
  getArchivedEmails: (params = {}) => api.get('/mail/archive', { params }),
  
  // Sync emails from Gmail (options: { targetCount, maxResults, query })
  syncEmails: (options = {}) => api.post('/mail/sync', options),
  
  // Mark email as read/unread
  markAsRead: (messageId, isRead = true) => 
    api.patch(`/mail/messages/${messageId}/read`, { isRead }),

  // Toggle star status
  toggleStar: (messageId, isStarred) => 
    api.put(`/mail/messages/${messageId}/star`, { isStarred }),

  // Archive or unarchive email
  archiveEmail: (messageId, isArchived = true) => 
    api.put(`/mail/messages/${messageId}/archive`, { isArchived }),
  
  // Delete email
  deleteEmail: (messageId) => api.delete(`/mail/messages/${messageId}`),
  
  // Search emails
  searchEmails: (query) => api.get('/mail/search', { params: { q: query } }),

  // Send email (multipart/form-data)
  sendEmail: (formData) => 
    api.post('/mail/send', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Reply All to an email
  replyAll: (messageId, data) => 
    api.post(`/mail/messages/${messageId}/reply-all`, data),

  // Forward an email
  forward: (messageId, data) => 
    api.post(`/mail/messages/${messageId}/forward`, data),

  // Get unsubscribe information
  getUnsubscribeInfo: (messageId) =>
    api.get(`/mail/messages/${messageId}/unsubscribe-info`),

  // Unsubscribe from email
  unsubscribe: (messageId, method) =>
    api.post(`/mail/messages/${messageId}/unsubscribe`, { method }),

  // Get all unsubscribed addresses
  getUnsubscribes: () =>
    api.get('/mail/unsubscribes'),

  // Batch delete messages
  batchDelete: (messageIds) =>
    api.post('/mail/batch-delete', { messageIds }),

  // Batch archive messages
  batchArchive: (messageIds) =>
    api.post('/mail/batch-archive', { messageIds }),
  
  // Batch mark as read/unread
  batchMarkAsRead: (messageIds, isRead) =>
    api.post('/mail/batch-read', { messageIds, isRead }),
  
  // Get Smart Cleanup candidates
  getCleanupCandidates: (params = {}) =>
    api.get('/mail/cleanup-candidates', { params }),

  // Get pending decisions
  getPendingDecisions: () =>
    api.get('/mail/decisions/pending'),
  
  // Mark decision as done (legacy)
  markDecisionDone: (emailId) =>
    api.post(`/mail/decisions/${emailId}/done`),
  
  // Mark decision as completed
  markDecisionCompleted: (emailId) =>
    api.post(`/mail/decisions/${emailId}/completed`),
  
  // Ignore decision
  ignoreDecision: (emailId) =>
    api.post(`/mail/decisions/${emailId}/ignore`),
  
  // Snooze decision
  snoozeDecision: (emailId, snoozedUntil) =>
    api.post(`/mail/decisions/${emailId}/snooze`, { snoozedUntil }),
  
  // Mark as not a decision
  markAsNotDecision: (emailId) =>
    api.post(`/mail/decisions/${emailId}/not-decision`)
}

/**
 * AI API methods
 */

export const aiAPI = {
  // Get AI status and configuration
  getStatus: () => api.get('/ai/status'),

  // Analyze email content
  analyzeEmail: (messageId) => api.post(`/ai/analyze/${messageId}`),

  // Summarize email content
  summarizeMail: (subject, content) => api.post('/ai/summarize', { subject, content }),

  // Generate reply suggestions (old)
  generateReply: (messageId, context = {}) => 
    api.post(`/ai/reply/${messageId}`, { context }),

  // Generate smart reply suggestions (new, for MessageView)
  suggestReply: (subject, content) => api.post('/ai/reply', { subject, content }),

  // Draft full email with AI
  draftEmail: (subject, content, instructions = '') => 
    api.post('/ai/draft', { subject, content, instructions }),

  // Analyze tone and generate contextual reply suggestions
  analyzeTone: (subject, content) => 
    api.post('/ai/analyze-tone', { subject, content }),

  // Get AI processing history
  getProcessingHistory: (messageId) => api.get(`/ai/history/${messageId}`)
}

// Helper exports for inbox/message/AI features
export const getMails = mailAPI.getEmails;
export const getMailById = mailAPI.getEmail;
export const summarizeMail = aiAPI.summarizeMail;
export const generateReply = aiAPI.generateReply;
/**
 * Generic API helper methods
 */
export const apiHelpers = {
  // Handle API errors consistently
  handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'Server error occurred'
      console.error('API Error:', message, error.response.status)
      return { error: message, status: error.response.status }
    } else if (error.request) {
      // Network error
      console.error('Network Error:', error.message)
      return { error: 'Network connection failed', status: 0 }
    } else {
      // Other error
      console.error('Request Error:', error.message)
      return { error: 'Request failed', status: -1 }
    }
  },

  // Set authentication token
  setAuthToken: (token) => {
    localStorage.setItem('smartmail_token', token)
  },

  // Get authentication token
  getAuthToken: () => {
    return localStorage.getItem('smartmail_token')
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('smartmail_token')
    const user = localStorage.getItem('smartmail_user')
    return !!(token && user)
  }
}

// Google OAuth login function for landing page
export async function loginWithGoogle() {
  const backendURL = window.location.hostname.includes('onrender.com')
    ? 'https://smartmail-w4ff.onrender.com'
    : 'http://localhost:3001';
  window.location.href = `${backendURL}/api/auth/google`;
}

export default api