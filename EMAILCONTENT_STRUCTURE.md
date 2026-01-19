# EmailContent Component - Visual Structure Guide

## 🎨 Component Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    EmailContent Component                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    HEADER SECTION                       │ │
│  │  ┌──────┐                                               │ │
│  │  │      │  Sender Name                 Timestamp       │ │
│  │  │  JS  │  sender@email.com                            │ │
│  │  │      │                                               │ │
│  │  └──────┘                                               │ │
│  │         Avatar (50px)                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   SUBJECT & LABELS                      │ │
│  │                                                          │ │
│  │  Email Subject Line Here                                │ │
│  │  [Label 1] [Label 2] [Label 3]                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    ACTION BAR                           │ │
│  │                                                          │ │
│  │  [Reply] [Reply All] [Forward] [Archive]               │ │
│  │  [Delete] [Mark Unread]                   [Dark Mode]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    EMAIL BODY                           │ │
│  │                  (Scrollable Area)                      │ │
│  │                                                          │ │
│  │  Email content goes here...                            │ │
│  │  • Formatted with HTML                                 │ │
│  │  • Sanitized for security                              │ │
│  │  • Expandable/Collapsible                              │ │
│  │                                                          │ │
│  │  [Expand ▼] / [Collapse ▲]                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   ATTACHMENTS                           │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ 📄 filename.pdf                                   │  │ │
│  │  │ 2.3 MB                          [Download ↓]     │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ 📊 spreadsheet.xlsx                               │  │ │
│  │  │ 512 KB                          [Download ↓]     │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Component Breakdown

### 1. Header Section
```jsx
┌──────────────────────────────────────────────────┐
│  [Avatar]  Sender Name           Timestamp       │
│            sender@email.com                      │
└──────────────────────────────────────────────────┘

Elements:
• Avatar: 50x50px circle with initials or User icon
• Sender Name: Bold, large text
• Sender Email: Gray, smaller text
• Timestamp: Smart formatted (Today at 2:30 PM)
```

**Code:**
```jsx
<div className="flex items-start space-x-4 mb-4">
  {/* Avatar */}
  <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
    {avatarUrl ? (
      <img src={avatarUrl} alt={sender} className="w-full h-full rounded-full object-cover" />
    ) : (
      getInitials(sender)
    )}
  </div>
  
  {/* Sender Info */}
  <div className="flex-1 min-w-0">
    <div className="flex items-start justify-between">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-white">{sender}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{senderEmail}</p>
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400 ml-4 flex-shrink-0">
        {formatTimestamp(timestamp)}
      </span>
    </div>
  </div>
</div>
```

---

### 2. Subject & Labels Section
```jsx
┌──────────────────────────────────────────────────┐
│  Email Subject Line Here                         │
│  [Work] [Important] [Projects]                  │
└──────────────────────────────────────────────────┘

Elements:
• Subject: Large, bold heading
• Labels: Color-coded badges based on category
```

**Code:**
```jsx
<div className="mb-4">
  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
    {subject}
  </h2>
  
  {labels.length > 0 && (
    <div className="flex flex-wrap gap-2">
      {labels.map((label, index) => (
        <span
          key={index}
          className={`px-2 py-1 rounded-full text-xs font-semibold ${getLabelColor(label)}`}
        >
          {label}
        </span>
      ))}
    </div>
  )}
</div>
```

---

### 3. Action Bar
```jsx
┌──────────────────────────────────────────────────┐
│  [Reply] [Reply All] [Forward] [Archive]        │
│  [Delete] [Mark Unread]             [🌙]        │
└──────────────────────────────────────────────────┘

Elements:
• Primary Actions: Reply, Reply All, Forward
• Secondary Actions: Archive, Delete, Mark Unread
• Theme Toggle: Dark mode switch
```

**Code:**
```jsx
<div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
  <button onClick={onReply} className="btn-action">
    <Reply className="w-4 h-4 mr-2" />
    Reply
  </button>
  <button onClick={onReplyAll} className="btn-action">
    <ReplyAll className="w-4 h-4 mr-2" />
    Reply All
  </button>
  <button onClick={onForward} className="btn-action">
    <Forward className="w-4 h-4 mr-2" />
    Forward
  </button>
  
  <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-2" />
  
  <button onClick={onArchive} className="btn-action-secondary">
    <Archive className="w-4 h-4 mr-2" />
    Archive
  </button>
  <button onClick={onDelete} className="btn-action-danger">
    <Trash2 className="w-4 h-4 mr-2" />
    Delete
  </button>
  <button onClick={onMarkUnread} className="btn-action-secondary">
    <MailOpen className="w-4 h-4 mr-2" />
    Mark Unread
  </button>
  
  <div className="ml-auto">
    <button onClick={toggleDarkMode} className="btn-icon">
      {darkMode ? '☀️' : '🌙'}
    </button>
  </div>
</div>
```

---

### 4. Email Body
```jsx
┌──────────────────────────────────────────────────┐
│  Email content with rich formatting...          │
│  • HTML support                                  │
│  • Sanitized content                             │
│  • Expandable/Collapsible                        │
│                                                   │
│  [Expand ▼] / [Collapse ▲]                      │
└──────────────────────────────────────────────────┘

Elements:
• Scrollable content area
• Sanitized HTML rendering
• Expand/collapse toggle
• Max height with overflow
```

**Code:**
```jsx
<div className="mb-6">
  <div className={`prose max-w-none dark:prose-invert overflow-auto ${expanded ? 'max-h-none' : 'max-h-96'}`}>
    <div
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(body, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote'],
          ALLOWED_ATTR: ['href', 'target', 'rel']
        })
      }}
    />
  </div>
  
  <button onClick={toggleExpand} className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium">
    {expanded ? (
      <>
        <ChevronUp className="w-4 h-4 inline mr-1" />
        Collapse
      </>
    ) : (
      <>
        <ChevronDown className="w-4 h-4 inline mr-1" />
        Expand
      </>
    )}
  </button>
</div>
```

---

### 5. Attachments Section
```jsx
┌──────────────────────────────────────────────────┐
│  📎 Attachments (3)                              │
│                                                   │
│  ┌────────────────────────────────────────────┐ │
│  │ 📄 filename.pdf                             │ │
│  │ 2.3 MB                    [Download ↓]     │ │
│  └────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────┐ │
│  │ 📊 spreadsheet.xlsx                         │ │
│  │ 512 KB                    [Download ↓]     │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘

Elements:
• Attachment count
• File icon
• Filename
• File size (formatted)
• Download button
```

**Code:**
```jsx
{attachments.length > 0 && (
  <div className="mb-6">
    <div className="flex items-center mb-3">
      <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
      <h3 className="font-semibold text-gray-900 dark:text-white">
        Attachments ({attachments.length})
      </h3>
    </div>
    
    <div className="space-y-2">
      {attachments.map((attachment, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center min-w-0 flex-1">
            <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {attachment.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(attachment.size)}
              </p>
            </div>
          </div>
          
          <a
            href={attachment.url}
            download={attachment.name}
            className="ml-4 btn-icon flex-shrink-0"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      ))}
    </div>
  </div>
)}
```

---

## 🎨 Styling Classes

### Button Styles
```css
/* Primary Action Button */
.btn-action {
  @apply flex items-center px-4 py-2 bg-primary-50 text-primary-700 
         hover:bg-primary-100 rounded-lg transition-colors font-medium;
}

/* Secondary Action Button */
.btn-action-secondary {
  @apply flex items-center px-4 py-2 bg-gray-50 text-gray-700 
         hover:bg-gray-100 rounded-lg transition-colors font-medium;
}

/* Danger Action Button */
.btn-action-danger {
  @apply flex items-center px-4 py-2 bg-red-50 text-red-700 
         hover:bg-red-100 rounded-lg transition-colors font-medium;
}

/* Icon Button */
.btn-icon {
  @apply p-2 hover:bg-gray-100 dark:hover:bg-gray-700 
         rounded-lg transition-colors;
}
```

### Label Colors
```javascript
const getLabelColor = (label) => {
  const colors = {
    'Work': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Important': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'Projects': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Personal': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Finance': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Updates': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    'default': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
  
  return colors[label] || colors['default']
}
```

---

## 🔧 Helper Functions

### 1. Get Initials
```javascript
const getInitials = (name) => {
  if (!name) return <User className="w-6 h-6" />
  
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}
```

### 2. Format Timestamp
```javascript
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  } else if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}
```

### 3. Format File Size
```javascript
const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile (< 640px) */
@media (max-width: 640px) {
  - Stack action buttons vertically
  - Reduce avatar size to 40px
  - Single column layout
}

/* Tablet (640px - 1024px) */
@media (min-width: 640px) and (max-width: 1024px) {
  - Wrap action buttons in 2 rows
  - Standard avatar size (50px)
  - Optimized spacing
}

/* Desktop (> 1024px) */
@media (min-width: 1024px) {
  - Full horizontal action bar
  - Large avatar (50px)
  - Maximum readability
}
```

---

## 🌙 Dark Mode

### Theme Toggle State
```javascript
const [darkMode, setDarkMode] = useState(false)

const toggleDarkMode = () => {
  setDarkMode(!darkMode)
}
```

### Dark Mode Classes
```jsx
<div className={darkMode ? 'dark' : ''}>
  {/* Component content with dark: classes */}
</div>
```

All elements use Tailwind's `dark:` variants:
- `bg-white dark:bg-gray-900`
- `text-gray-900 dark:text-white`
- `border-gray-200 dark:border-gray-700`

---

## ✅ Accessibility

### ARIA Labels
```jsx
<button aria-label="Reply to email" onClick={onReply}>
  <Reply className="w-4 h-4" />
  Reply
</button>
```

### Keyboard Navigation
- All buttons are keyboard accessible
- Tab through interactive elements
- Enter/Space to activate

### Screen Reader Support
- Semantic HTML structure
- Descriptive labels
- Alt text for images

---

## 🎉 Summary

The EmailContent component provides a **complete, professional email viewing experience** with:

✅ **5 Main Sections**: Header, Subject, Actions, Body, Attachments
✅ **15+ Features**: Avatar, timestamps, labels, actions, dark mode, etc.
✅ **3 Helper Functions**: Initials, timestamp formatting, file size
✅ **Fully Responsive**: Mobile, tablet, desktop optimized
✅ **Accessible**: ARIA labels, keyboard navigation
✅ **Secure**: XSS protection with DOMPurify
✅ **Beautiful**: Gmail-like professional design

**Ready to use in production!** 🚀
