import React from 'react'
import EmailContent from '../components/EmailContent'

/**
 * Demo page to showcase EmailContent component
 */
export default function EmailContentDemo() {
  // Sample email data
  const sampleEmail = {
    sender: 'John Smith',
    senderEmail: 'john.smith@company.com',
    subject: 'Q4 Project Update - Review Required',
    body: `
      <p>Hi Team,</p>
      
      <p>I hope this email finds you well. I wanted to share an important update regarding our Q4 project timeline and deliverables.</p>
      
      <h3>Key Updates:</h3>
      <ul>
        <li><strong>Phase 1:</strong> Successfully completed ahead of schedule ✅</li>
        <li><strong>Phase 2:</strong> Currently in progress, on track for next week</li>
        <li><strong>Phase 3:</strong> Planning meeting scheduled for Friday</li>
      </ul>
      
      <p>Please review the attached documents and provide your feedback by <strong>end of day Friday</strong>.</p>
      
      <blockquote style="border-left: 4px solid #e5e7eb; padding-left: 16px; margin: 16px 0; color: #6b7280;">
        "The secret to getting ahead is getting started." - Mark Twain
      </blockquote>
      
      <p>For more details, please visit our <a href="https://project-dashboard.example.com" target="_blank" rel="noopener">project dashboard</a>.</p>
      
      <p>Looking forward to your input!</p>
      
      <p>Best regards,<br/>
      John Smith<br/>
      Project Manager<br/>
      Company Inc.</p>
    `,
    timestamp: new Date().toISOString(),
    avatarUrl: null, // Will use initials
    attachments: [
      {
        name: 'Q4-Project-Timeline.pdf',
        size: 2458624, // bytes
        url: '#'
      },
      {
        name: 'Budget-Overview.xlsx',
        size: 524288,
        url: '#'
      },
      {
        name: 'Meeting-Notes.docx',
        size: 98304,
        url: '#'
      }
    ],
    labels: ['Work', 'Important', 'Projects'],
    isUnread: true
  }

  const handleReply = () => {
    console.log('Reply clicked')
    alert('Reply action triggered')
  }

  const handleReplyAll = () => {
    console.log('Reply All clicked')
    alert('Reply All action triggered')
  }

  const handleForward = () => {
    console.log('Forward clicked')
    alert('Forward action triggered')
  }

  const handleArchive = () => {
    console.log('Archive clicked')
    alert('Archive action triggered')
  }

  const handleDelete = () => {
    console.log('Delete clicked')
    if (window.confirm('Are you sure you want to delete this email?')) {
      alert('Email deleted')
    }
  }

  const handleMarkUnread = () => {
    console.log('Mark Unread clicked')
    alert('Marked as unread')
  }

  return (
    <div className="h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">EmailContent Component Demo</h1>
          <p className="text-gray-600">
            A professional email viewer component with Gmail-like styling
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <EmailContent
            sender={sampleEmail.sender}
            senderEmail={sampleEmail.senderEmail}
            subject={sampleEmail.subject}
            body={sampleEmail.body}
            timestamp={sampleEmail.timestamp}
            avatarUrl={sampleEmail.avatarUrl}
            attachments={sampleEmail.attachments}
            labels={sampleEmail.labels}
            isUnread={sampleEmail.isUnread}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onMarkUnread={handleMarkUnread}
          />
        </div>
      </div>
    </div>
  )
}
