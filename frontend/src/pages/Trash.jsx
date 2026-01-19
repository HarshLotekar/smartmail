import React, { useState, useEffect } from 'react';
import { Trash2, Loader2, RefreshCw } from 'lucide-react';
import { mailAPI } from '../services/api';
import InboxCard from '../components/InboxCard';
import { useNavigate } from 'react-router-dom';

export default function Trash() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTrashedEmails();
  }, []);

  const fetchTrashedEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch trash emails directly from Gmail API
      const response = await mailAPI.getTrashEmails();
      
      const trashedEmails = response.data.messages || [];
      setEmails(trashedEmails);
    } catch (err) {
      console.error('Failed to fetch trash:', err);
      setError('Failed to load trash');
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
          <button onClick={fetchTrashedEmails} className="btn-primary">
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
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-red-500" />
              <h1 className="text-2xl font-bold gradient-text">Trash</h1>
            </div>
            <p className="text-text-secondary mt-2">
              {emails.length} {emails.length === 1 ? 'email' : 'emails'} in trash
            </p>
          </div>
          {emails.length > 0 && (
            <button className="btn-danger text-sm">
              Empty Trash
            </button>
          )}
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto p-6">
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <Trash2 className="w-16 h-16 mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">No emails in trash</p>
            <p className="text-text-muted text-sm mt-2">Deleted emails appear here for 30 days</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emails.map((email) => (
              <InboxCard
                key={email.id}
                email={email}
                onOpen={() => navigate(`/message/${email.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
