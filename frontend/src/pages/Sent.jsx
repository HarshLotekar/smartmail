import React, { useState, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { mailAPI } from '../services/api';
import InboxCard from '../components/InboxCard';
import { useNavigate } from 'react-router-dom';

export default function Sent() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSentEmails();
  }, []);

  const fetchSentEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch sent emails from Gmail API
      const response = await mailAPI.getSentEmails();
      
      if (response.data.success) {
        setEmails(response.data.messages || []);
      } else {
        setError(response.data.error || 'Failed to fetch sent emails');
      }
    } catch (err) {
      console.error('Failed to fetch sent emails:', err);
      setError(err.response?.data?.message || 'Failed to load sent emails');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-text-primary mb-4">{error}</p>
          <button onClick={fetchSentEmails} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-card-border">
        <div className="flex items-center gap-3">
          <Send className="w-6 h-6 text-accent-primary" />
          <h1 className="text-2xl font-bold gradient-text">Sent Mail</h1>
        </div>
        <p className="text-text-secondary mt-2">
          {emails.length} sent {emails.length === 1 ? 'email' : 'emails'}
        </p>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto p-6">
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <Send className="w-16 h-16 mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary text-lg mb-2">No sent emails</p>
            <p className="text-text-muted text-sm">
              Emails you send will appear here
            </p>
            <button 
              onClick={() => navigate('/inbox')}
              className="btn-primary mt-6"
            >
              Back to Inbox
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emails.map((email) => (
              <InboxCard
                key={email.gmail_id || email.gmailId || email.id}
                email={email}
                onOpen={() => {
                  // Navigate to message detail view
                  const messageId = email.id || email.gmail_id || email.gmailId
                  if (messageId) {
                    navigate(`/message/${messageId}`)
                  } else {
                    console.error('No message ID found for email:', email)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
