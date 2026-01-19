import axios from 'axios';

// Use relative URL to go through Vite proxy
const API_URL = '';

/**
 * Chat API Service
 * Handles communication with SmartMail AI chatbot
 */

/**
 * Send message to chatbot
 */
export const sendChatMessage = async (message, conversationHistory = []) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/chat`,
      { message, conversationHistory },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Chat message error:', error);
    throw new Error(error.response?.data?.message || 'Failed to send message');
  }
};

/**
 * Execute suggested action from chat
 */
export const executeChatAction = async (action, emailIds = []) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/chat/action`,
      { action, emailIds },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Chat action error:', error);
    throw new Error(error.response?.data?.message || 'Failed to execute action');
  }
};

/**
 * Get chat help and capabilities
 */
export const getChatHelp = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/api/chat/help`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error('Chat help error:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch help');
  }
};

export default {
  sendChatMessage,
  executeChatAction,
  getChatHelp
};
