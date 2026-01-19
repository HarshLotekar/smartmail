import React, { useState, useEffect } from 'react';
import { Archive, Loader2, MailOpen } from 'lucide-react';
import { mailAPI } from '../services/api';
import InboxCard from '../components/InboxCard';
import { useNavigate } from 'react-router-dom';

export default function ArchivedEmails() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchArchivedEmails();
  }, []);

  const fetchArchivedEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch archived emails directly from Gmail API
      const response = await mailAPI.getArchivedEmails();
      
      const archivedEmails = response.data.messages || [];
      setEmails(archivedEmails);
    } catch (err) {
      console.error('Failed to fetch archived emails:', err);
      setError('Failed to load archived emails');
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (emailId) => {
    try {
      await mailAPI.archiveEmail(emailId, false);
      // Refresh list
      fetchArchivedEmails();
    } catch (err) {
      console.error('Failed to unarchive email:', err);
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
          <button onClick={fetchArchivedEmails} className="btn-primary">
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
          <Archive className="w-6 h-6 text-accent-primary" />
          <h1 className="text-2xl font-bold gradient-text">Archive</h1>
        </div>
        <p className="text-text-secondary mt-2">
          {emails.length} archived {emails.length === 1 ? 'email' : 'emails'}
        </p>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto p-6">
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="w-16 h-16 mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">No archived emails</p>
            <p className="text-text-muted text-sm mt-2">Archive emails to keep your inbox clean</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emails.map((email) => (
              <InboxCard
                key={email.id || email.gmail_id || email.gmailId}
                email={email}
                onOpen={() => navigate(`/message/${email.id || email.gmail_id || email.gmailId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
