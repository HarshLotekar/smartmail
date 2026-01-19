import React, { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { mailAPI } from '../services/api';
import InboxCard from '../components/InboxCard';
import { useNavigate } from 'react-router-dom';

export default function Starred() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStarredEmails();
  }, []);

  const fetchStarredEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch starred emails from Gmail API
      const response = await mailAPI.getStarredEmails();
      
      const starredEmails = response.data.messages || [];
      setEmails(starredEmails);
    } catch (err) {
      console.error('Failed to fetch starred emails:', err);
      setError('Failed to load starred emails');
    } finally {
      setLoading(false);
    }
  };

  const handleStarToggle = async (emailId, isStarred) => {
    try {
      await mailAPI.starEmail(emailId, !isStarred);
      // Refresh list
      fetchStarredEmails();
    } catch (err) {
      console.error('Failed to toggle star:', err);
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
          <button onClick={fetchStarredEmails} className="btn-primary">
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
          <Star className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold gradient-text">Starred</h1>
        </div>
        <p className="text-text-secondary mt-2">
          {emails.length} starred {emails.length === 1 ? 'email' : 'emails'}
        </p>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto p-6">
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-16 h-16 mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">No starred emails</p>
            <p className="text-text-muted text-sm mt-2">Star important emails to find them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emails.map((email) => {
              const emailId = email.id || email.gmail_id || email.gmailId
              return (
                <InboxCard
                  key={emailId}
                  email={email}
                  onOpen={() => navigate(`/message/${emailId}`)}
                  onStarToggle={() => handleStarToggle(emailId, email.is_starred)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
