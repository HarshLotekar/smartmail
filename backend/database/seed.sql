-- SmartMail Database Seed Data
-- Sample data for testing and development
-- Created: October 2025

-- =============================================================================
-- SAMPLE TEST DATA FOR DEVELOPMENT
-- =============================================================================

-- Sample Test Users
INSERT OR IGNORE INTO users (
    google_id, email, name, avatar_url, preferences
) VALUES 
(
    'dev_user_123456789',
    'john.doe@smartmail.dev', 
    'John Doe',
    'https://via.placeholder.com/150/007bff/ffffff?text=JD',
    '{"ai":{"provider":"ollama","auto_process":true,"confidence_threshold":0.75},"ui":{"theme":"light","items_per_page":25},"notifications":{"email":true,"frequency":"immediate"}}'
),
(
    'dev_user_987654321',
    'sarah.smith@smartmail.dev',
    'Sarah Smith',
    'https://via.placeholder.com/150/28a745/ffffff?text=SS',
    '{"ai":{"provider":"gemini","auto_process":true,"confidence_threshold":0.8},"ui":{"theme":"dark","items_per_page":50},"notifications":{"email":false,"frequency":"daily"}}'
);

-- System Labels for John Doe (User ID = 1)
INSERT OR IGNORE INTO labels (
    user_id, name, color, description, is_system, gmail_label_id
) VALUES
(1, 'Inbox', '#1a73e8', 'Primary inbox for incoming emails', 1, 'INBOX'),
(1, 'Sent', '#34a853', 'Emails sent by the user', 1, 'SENT'),
(1, 'Drafts', '#ea4335', 'Draft emails not yet sent', 1, 'DRAFT'),
(1, 'Trash', '#9aa0a6', 'Deleted emails', 1, 'TRASH'),
(1, 'Spam', '#fbbc04', 'Spam and junk emails', 1, 'SPAM'),
(1, 'Starred', '#fbbc04', 'Starred important emails', 1, 'STARRED'),
(1, 'Important', '#ea4335', 'Gmail important emails', 1, 'IMPORTANT');

-- System Labels for Sarah Smith (User ID = 2)
INSERT OR IGNORE INTO labels (
    user_id, name, color, description, is_system, gmail_label_id
) VALUES
(2, 'Inbox', '#1a73e8', 'Primary inbox for incoming emails', 1, 'INBOX'),
(2, 'Sent', '#34a853', 'Emails sent by the user', 1, 'SENT'),
(2, 'Drafts', '#ea4335', 'Draft emails not yet sent', 1, 'DRAFT'),
(2, 'Trash', '#9aa0a6', 'Deleted emails', 1, 'TRASH'),
(2, 'Spam', '#fbbc04', 'Spam and junk emails', 1, 'SPAM'),
(2, 'Starred', '#fbbc04', 'Starred important emails', 1, 'STARRED'),
(2, 'Important', '#ea4335', 'Gmail important emails', 1, 'IMPORTANT');

-- AI Category Labels for John Doe (User ID = 1)
INSERT OR IGNORE INTO labels (
    user_id, name, color, description, is_system, auto_apply, ai_rules
) VALUES
(1, 'Work', '#1976d2', 'Work-related emails and communications', 1, 1, 
 '{"keywords":["meeting","project","deadline","report","presentation","client"],"confidence_threshold":0.8}'),
(1, 'Personal', '#388e3c', 'Personal emails from friends and family', 1, 1,
 '{"keywords":["personal","family","friend","birthday","vacation"],"confidence_threshold":0.7}'),
(1, 'Promotions', '#f57c00', 'Marketing emails and promotions', 1, 1,
 '{"keywords":["sale","discount","offer","deal","% off","free shipping"],"confidence_threshold":0.9}'),
(1, 'Finance', '#00796b', 'Banking and financial communications', 1, 1,
 '{"keywords":["bank","payment","invoice","statement","transaction"],"confidence_threshold":0.85}'),
(1, 'Social', '#9c27b0', 'Social media and networking notifications', 1, 1,
 '{"keywords":["LinkedIn","Facebook","Twitter","Instagram","notification"],"confidence_threshold":0.8}'),
(1, 'Travel', '#00acc1', 'Travel bookings and itineraries', 1, 1,
 '{"keywords":["flight","hotel","booking","itinerary","reservation"],"confidence_threshold":0.9}');

-- AI Category Labels for Sarah Smith (User ID = 2)
INSERT OR IGNORE INTO labels (
    user_id, name, color, description, is_system, auto_apply, ai_rules
) VALUES
(2, 'Work', '#1976d2', 'Work-related emails and communications', 1, 1, 
 '{"keywords":["meeting","project","deadline","report","presentation","client"],"confidence_threshold":0.8}'),
(2, 'Personal', '#388e3c', 'Personal emails from friends and family', 1, 1,
 '{"keywords":["personal","family","friend","birthday","vacation"],"confidence_threshold":0.7}'),
(2, 'Promotions', '#f57c00', 'Marketing emails and promotions', 1, 1,
 '{"keywords":["sale","discount","offer","deal","% off","free shipping"],"confidence_threshold":0.9}'),
(2, 'Finance', '#00796b', 'Banking and financial communications', 1, 1,
 '{"keywords":["bank","payment","invoice","statement","transaction"],"confidence_threshold":0.85}'),
(2, 'Newsletters', '#ff9800', 'Email newsletters and updates', 1, 1,
 '{"keywords":["newsletter","update","digest","weekly","monthly"],"confidence_threshold":0.85}'),
(2, 'Shopping', '#e91e63', 'Online shopping and e-commerce', 1, 1,
 '{"keywords":["order","shipping","delivery","cart","purchase"],"confidence_threshold":0.8}');

-- Custom Labels for John Doe (User ID = 1)
INSERT OR IGNORE INTO labels (
    user_id, name, color, description, is_system
) VALUES
(1, 'Urgent', '#d32f2f', 'High priority emails requiring immediate attention', 0),
(1, 'Client Projects', '#512da8', 'Communications with clients and customers', 0),
(1, 'Team Updates', '#795548', 'Updates from team members and colleagues', 0),
(1, 'Learning', '#607d8b', 'Educational content and courses', 0);

-- Custom Labels for Sarah Smith (User ID = 2)
INSERT OR IGNORE INTO labels (
    user_id, name, color, description, is_system
) VALUES
(2, 'Priority', '#d32f2f', 'High priority emails requiring immediate attention', 0),
(2, 'Research', '#3f51b5', 'Research papers and academic content', 0),
(2, 'Events', '#ff5722', 'Event invitations and announcements', 0),
(2, 'Follow Up', '#9e9e9e', 'Emails that require follow-up action', 0);

-- Sample Messages for John Doe (User ID = 1)
INSERT OR IGNORE INTO messages (
    user_id, gmail_id, thread_id, subject, from_email, from_name, 
    to_email, body_text, snippet, date, is_read, is_starred,
    ai_processed, ai_category, ai_priority, ai_summary, ai_sentiment, ai_confidence
) VALUES 
(1, 'msg_001_john', 'thread_001', 'Welcome to SmartMail!', 
 'welcome@smartmail.dev', 'SmartMail Team', 'john.doe@smartmail.dev',
 'Welcome to SmartMail! We are excited to have you on board. This AI-powered email organizer will help you manage your inbox more efficiently. Our advanced algorithms will automatically categorize your emails, suggest replies, and help you stay organized. Get started by connecting your Gmail account and let our AI do the heavy lifting!',
 'Welcome to SmartMail! We are excited to have you on board...',
 datetime('now', '-2 hours'), 1, 1, 1, 'Personal', 1,
 'Welcome email from SmartMail team introducing the AI-powered email organization platform', 'positive', 0.95),

(1, 'msg_002_john', 'thread_002', 'Project Status Meeting - Tomorrow 10 AM',
 'manager@techcorp.com', 'Sarah Johnson', 'john.doe@smartmail.dev', 
 'Hi John, I hope this email finds you well. Please join our weekly project status meeting tomorrow at 10 AM in Conference Room B. We will discuss current progress on the Q4 initiatives, review upcoming deadlines, and address any blockers the team might be facing. Please bring your status reports and be prepared to discuss your current workload. Looking forward to seeing everyone there!',
 'Hi John, please join our weekly project status meeting tomorrow...',
 datetime('now', '-45 minutes'), 0, 0, 1, 'Work', 2,
 'Meeting invitation for weekly project status review with team updates', 'neutral', 0.88),

(1, 'msg_003_john', 'thread_003', 'Flash Sale: 50% Off Everything!',
 'noreply@fashionstore.com', 'Fashion Store', 'john.doe@smartmail.dev',
 'FLASH SALE ALERT! 🔥 Limited time offer - Get 50% off everything in our store! From the latest fashion trends to classic wardrobe staples, everything is half price. Sale ends at midnight tonight, so don''t miss out! Free shipping on orders over $50. Use code: FLASH50 at checkout. Shop now before your favorite items sell out!',
 'FLASH SALE ALERT! Limited time offer - Get 50% off everything...',
 datetime('now', '-3 hours'), 0, 0, 1, 'Promotions', 0,
 'Flash sale promotional email offering 50% discount on all items with free shipping', 'neutral', 0.92),

(1, 'msg_004_john', 'thread_004', 'Your Monthly Bank Statement is Ready',
 'statements@mybank.com', 'MyBank Customer Service', 'john.doe@smartmail.dev',
 'Dear Mr. Doe, Your monthly statement for checking account ending in 1234 is now available for review. This statement covers transactions from September 1-30, 2025. You can view your statement securely in online banking or download the PDF version from your account dashboard. If you have any questions about your statement, please contact our customer service team at 1-800-MYBANK.',
 'Your monthly statement for checking account ending in 1234 is now available...',
 datetime('now', '-1 day'), 1, 0, 1, 'Finance', 1,
 'Monthly bank statement notification with secure access instructions', 'neutral', 0.87),

(1, 'msg_005_john', 'thread_005', 'LinkedIn: You have 3 new connection requests',
 'notifications@linkedin.com', 'LinkedIn', 'john.doe@smartmail.dev',
 'Hi John, You have 3 new connection requests waiting for your response: 1) Alex Chen - Software Engineer at TechStart 2) Maria Rodriguez - Product Manager at InnovaCorp 3) David Kim - Senior Developer at CodeCraft. View and manage your connection requests in your LinkedIn account.',
 'You have 3 new connection requests waiting for your response...',
 datetime('now', '-4 hours'), 0, 0, 1, 'Social', 0,
 'LinkedIn notification about pending connection requests from 3 professionals', 'neutral', 0.85),

(1, 'msg_006_john', 'thread_006', 'Flight Confirmation: NYC to LA - Flight AA1234',
 'confirmations@airline.com', 'American Airlines', 'john.doe@smartmail.dev',
 'Dear Mr. Doe, Your flight booking is confirmed! Flight Details: AA1234 from JFK (New York) to LAX (Los Angeles) on October 15, 2025 at 8:30 AM. Seat: 12A (Window). Please arrive at the airport 2 hours before departure. Check-in opens 24 hours before your flight. Have a great trip!',
 'Your flight booking is confirmed! Flight AA1234 from JFK to LAX...',
 datetime('now', '-6 hours'), 1, 1, 1, 'Travel', 2,
 'Flight confirmation for domestic trip from New York to Los Angeles with seat assignment', 'positive', 0.91),

(1, 'msg_007_john', 'thread_007', 'Re: Client Proposal Review - Action Required',
 'client@bigcorp.com', 'Jennifer Martinez', 'john.doe@smartmail.dev',
 'Hi John, Thank you for sending the updated proposal. I''ve reviewed it with our team and we have a few questions: 1) Can you clarify the timeline for Phase 2? 2) What are the additional costs for the premium features? 3) Do you offer 24/7 support? Please provide these details by EOD Friday so we can finalize our decision. Best regards, Jennifer',
 'Thank you for sending the updated proposal. I have reviewed it...',
 datetime('now', '-8 hours'), 0, 1, 1, 'Work', 3,
 'Client feedback on proposal requiring clarification on timeline, costs, and support options', 'neutral', 0.89),

(1, 'msg_008_john', 'thread_008', 'Weekend Plans - Family BBQ',
 'mom@family.com', 'Mom', 'john.doe@smartmail.dev',
 'Hi sweetie! Just wanted to let you know we''re having a family BBQ this Saturday at 2 PM. Your dad is excited to try his new smoker, and Aunt Linda is bringing her famous potato salad. Can you bring some drinks? Let me know if you can make it. Love you! P.S. - Don''t forget to call your grandmother, she misses you.',
 'Just wanted to let you know we are having a family BBQ this Saturday...',
 datetime('now', '-12 hours'), 1, 0, 1, 'Personal', 1,
 'Family BBQ invitation for Saturday with food assignments and reminder to call grandmother', 'positive', 0.93),

-- Sample Messages for Sarah Smith (User ID = 2)
(2, 'msg_001_sarah', 'thread_101', 'Research Paper Submission Deadline Extended',
 'editor@academicjournal.com', 'Dr. James Wilson', 'sarah.smith@smartmail.dev',
 'Dear Dr. Smith, Good news! We have extended the submission deadline for the Special Issue on "AI Applications in Modern Healthcare" to November 15, 2025. This gives you an additional two weeks to refine your research paper. We are particularly interested in your work on machine learning applications in diagnostic imaging. Please ensure all submissions follow our updated formatting guidelines available on our website.',
 'Good news! We have extended the submission deadline for the Special Issue...',
 datetime('now', '-1 hour'), 0, 1, 1, 'Work', 2,
 'Academic journal deadline extension for research paper submission with formatting guidelines', 'positive', 0.90),

(2, 'msg_002_sarah', 'thread_102', 'Amazon Order Shipped: Medical Textbooks',
 'auto-confirm@amazon.com', 'Amazon', 'sarah.smith@smartmail.dev',
 'Your Amazon order #123-4567890-1234567 has shipped! Package Contents: 1) "Advanced Radiology Techniques 4th Edition" 2) "Machine Learning in Medical Imaging" 3) "Clinical Data Analysis Methods". Estimated delivery: October 13, 2025 by 8:00 PM. Track your package with tracking number: 1Z999AA1234567890. Thank you for your order!',
 'Your Amazon order has shipped! Estimated delivery: October 13, 2025...',
 datetime('now', '-2 hours'), 1, 0, 1, 'Shopping', 1,
 'Amazon shipping confirmation for medical textbooks with tracking information and delivery date', 'neutral', 0.88),

(2, 'msg_003_sarah', 'thread_103', 'Weekly Research Digest - Medical AI Advances',
 'newsletter@medtech.com', 'MedTech Weekly', 'sarah.smith@smartmail.dev',
 'This week in Medical AI: 1) Revolutionary breakthrough in cancer detection using deep learning achieves 97% accuracy 2) New FDA guidelines for AI diagnostic tools released 3) Stanford researchers develop AI system for early Alzheimer''s detection 4) Interview with Dr. Sarah Chen on the future of AI in radiology. Read the full articles and join our community discussion forum.',
 'This week in Medical AI: Revolutionary breakthrough in cancer detection...',
 datetime('now', '-1 day'), 0, 0, 1, 'Newsletters', 0,
 'Weekly medical AI research digest covering breakthroughs, regulations, and expert interviews', 'neutral', 0.92),

(2, 'msg_004_sarah', 'thread_104', 'Conference Registration Reminder - MedAI 2025',
 'registration@medai2025.com', 'MedAI Conference', 'sarah.smith@smartmail.dev',
 'Dear Dr. Smith, This is a friendly reminder that early bird registration for MedAI 2025 Conference ends in 3 days (October 14). Secure your spot at the premier medical AI event featuring keynotes from industry leaders, hands-on workshops, and networking opportunities. Early bird price: $599 (Regular: $799). Register now to save $200!',
 'Friendly reminder that early bird registration for MedAI 2025 ends in 3 days...',
 datetime('now', '-3 hours'), 0, 1, 1, 'Work', 2,
 'Conference registration reminder with early bird pricing deadline and event highlights', 'neutral', 0.87),

(2, 'msg_005_sarah', 'thread_105', 'Happy Birthday! 🎉',
 'lisa.friend@email.com', 'Lisa Thompson', 'sarah.smith@smartmail.dev',
 'Happy Birthday Sarah! 🎂🎉 I hope you have an amazing day filled with joy and celebration. I still remember our college days when we used to study together in the library until midnight. Now look at you - a successful researcher making real differences in healthcare! Let''s catch up soon over coffee. Enjoy your special day! Love, Lisa',
 'Happy Birthday Sarah! I hope you have an amazing day filled with joy...',
 datetime('now', '-5 hours'), 1, 1, 1, 'Personal', 1,
 'Birthday wishes from college friend with nostalgic memories and invitation to catch up', 'positive', 0.95);

-- Message-Label Relationships for John Doe's Messages
INSERT OR IGNORE INTO message_labels (message_id, label_id, assigned_by, confidence) VALUES
-- Welcome message (msg_001_john)
(1, 1, 'sync', 1.0),   -- Inbox
(1, 9, 'ai', 0.95),    -- Personal

-- Project meeting (msg_002_john)  
(2, 1, 'sync', 1.0),   -- Inbox
(2, 8, 'ai', 0.88),    -- Work
(2, 17, 'user', 1.0),  -- Urgent (user assigned)

-- Flash sale (msg_003_john)
(3, 1, 'sync', 1.0),   -- Inbox
(3, 10, 'ai', 0.92),   -- Promotions

-- Bank statement (msg_004_john)
(4, 1, 'sync', 1.0),   -- Inbox
(4, 11, 'ai', 0.87),   -- Finance

-- LinkedIn notification (msg_005_john)
(5, 1, 'sync', 1.0),   -- Inbox
(5, 12, 'ai', 0.85),   -- Social

-- Flight confirmation (msg_006_john)
(6, 1, 'sync', 1.0),   -- Inbox
(6, 6, 'sync', 1.0),   -- Starred (user starred)
(6, 13, 'ai', 0.91),   -- Travel

-- Client proposal (msg_007_john)
(7, 1, 'sync', 1.0),   -- Inbox
(7, 6, 'user', 1.0),   -- Starred (user starred)
(7, 8, 'ai', 0.89),    -- Work
(7, 18, 'ai', 0.89),   -- Client Projects

-- Family BBQ (msg_008_john)
(8, 1, 'sync', 1.0),   -- Inbox
(8, 9, 'ai', 0.93),    -- Personal

-- Message-Label Relationships for Sarah Smith's Messages
-- Research deadline (msg_001_sarah)
(9, 15, 'sync', 1.0),  -- Inbox (Sarah's)
(9, 20, 'user', 1.0),  -- Starred (Sarah's)
(9, 22, 'ai', 0.90),   -- Work (Sarah's)

-- Amazon order (msg_002_sarah)
(10, 15, 'sync', 1.0), -- Inbox (Sarah's)
(10, 26, 'ai', 0.88),  -- Shopping (Sarah's)

-- Medical newsletter (msg_003_sarah)
(11, 15, 'sync', 1.0), -- Inbox (Sarah's)
(11, 25, 'ai', 0.92),  -- Newsletters (Sarah's)

-- Conference reminder (msg_004_sarah)
(12, 15, 'sync', 1.0), -- Inbox (Sarah's)
(12, 20, 'user', 1.0), -- Starred (Sarah's)
(12, 22, 'ai', 0.87),  -- Work (Sarah's)
(12, 29, 'ai', 0.87),  -- Events (Sarah's)

-- Birthday wishes (msg_005_sarah)
(13, 15, 'sync', 1.0), -- Inbox (Sarah's)
(13, 20, 'user', 1.0), -- Starred (Sarah's)
(13, 23, 'ai', 0.95);  -- Personal (Sarah's)

-- Email Threads for sample messages
INSERT OR IGNORE INTO email_threads (
    user_id, gmail_thread_id, subject, participants, message_count, 
    first_message_date, last_message_date, ai_summary
) VALUES
(1, 'thread_001', 'Welcome to SmartMail!', 
 '["welcome@smartmail.dev", "john.doe@smartmail.dev"]', 1,
 datetime('now', '-2 hours'), datetime('now', '-2 hours'),
 'Welcome email thread from SmartMail introducing the platform'),

(1, 'thread_002', 'Project Status Meeting - Tomorrow 10 AM',
 '["manager@techcorp.com", "john.doe@smartmail.dev"]', 1,
 datetime('now', '-45 minutes'), datetime('now', '-45 minutes'),
 'Work meeting invitation thread for project status review'),

(1, 'thread_007', 'Re: Client Proposal Review - Action Required',
 '["client@bigcorp.com", "john.doe@smartmail.dev"]', 1,
 datetime('now', '-8 hours'), datetime('now', '-8 hours'),
 'Client communication thread regarding proposal review and questions'),

(2, 'thread_101', 'Research Paper Submission Deadline Extended',
 '["editor@academicjournal.com", "sarah.smith@smartmail.dev"]', 1,
 datetime('now', '-1 hour'), datetime('now', '-1 hour'),
 'Academic journal thread about extended submission deadline'),

(2, 'thread_105', 'Happy Birthday! 🎉',
 '["lisa.friend@email.com", "sarah.smith@smartmail.dev"]', 1,
 datetime('now', '-5 hours'), datetime('now', '-5 hours'),
 'Personal birthday wishes thread from college friend');

-- AI Processing Logs for sample processing
INSERT OR IGNORE INTO ai_processing_logs (
    user_id, message_id, processing_type, ai_provider, ai_model,
    input_data, output_data, processing_time_ms, token_count, success,
    started_at, completed_at
) VALUES
(1, 1, 'categorize', 'ollama', 'llama2',
 '{"subject":"Welcome to SmartMail!","body":"Welcome to SmartMail! We are excited..."}',
 '{"category":"Personal","confidence":0.95,"reasoning":"Welcome email from service provider"}',
 1250, 45, 1, datetime('now', '-2 hours'), datetime('now', '-2 hours')),

(1, 1, 'summarize', 'ollama', 'llama2',
 '{"subject":"Welcome to SmartMail!","body":"Welcome to SmartMail! We are excited..."}',
 '{"summary":"Welcome email from SmartMail team introducing the AI-powered email organization platform","keywords":["welcome","smartmail","AI","email","organization"]}',
 890, 32, 1, datetime('now', '-2 hours'), datetime('now', '-2 hours')),

(1, 2, 'categorize', 'ollama', 'llama2',
 '{"subject":"Project Status Meeting - Tomorrow 10 AM","body":"Hi John, I hope this email..."}',
 '{"category":"Work","confidence":0.88,"reasoning":"Meeting invitation with work-related content"}',
 1100, 38, 1, datetime('now', '-45 minutes'), datetime('now', '-45 minutes')),

(1, 7, 'reply', 'ollama', 'llama2',
 '{"subject":"Re: Client Proposal Review - Action Required","body":"Hi John, Thank you for sending..."}',
 '{"suggested_replies":["Thank you for your feedback. I will provide the requested clarification by Friday.","I appreciate your questions. Let me address each point in detail."],"tone":"professional"}',
 2150, 78, 1, datetime('now', '-8 hours'), datetime('now', '-8 hours')),

(2, 9, 'categorize', 'gemini', 'gemini-pro',
 '{"subject":"Research Paper Submission Deadline Extended","body":"Dear Dr. Smith, Good news! We have extended..."}',
 '{"category":"Work","confidence":0.90,"reasoning":"Academic work-related email about research submission"}',
 850, 28, 1, datetime('now', '-1 hour'), datetime('now', '-1 hour')),

(2, 13, 'categorize', 'gemini', 'gemini-pro',
 '{"subject":"Happy Birthday! 🎉","body":"Happy Birthday Sarah! I hope you have..."}',
 '{"category":"Personal","confidence":0.95,"reasoning":"Personal birthday message from friend"}',
 750, 22, 1, datetime('now', '-5 hours'), datetime('now', '-5 hours')),

(2, 11, 'triage', 'gemini', 'gemini-pro',
 '{"subject":"Weekly Research Digest - Medical AI Advances","body":"This week in Medical AI: 1) Revolutionary breakthrough..."}',
 '{"priority":0,"urgency":"low","action_required":false,"category":"Newsletter","reasoning":"Regular newsletter content, informational only"}',
 920, 35, 1, datetime('now', '-1 day'), datetime('now', '-1 day'));

-- =============================================================================
-- SAMPLE DATA VERIFICATION QUERIES
-- =============================================================================

-- Verify sample data was inserted correctly
-- SELECT 'Users' as table_name, COUNT(*) as count FROM users
-- UNION ALL
-- SELECT 'Messages', COUNT(*) FROM messages  
-- UNION ALL
-- SELECT 'Labels', COUNT(*) FROM labels
-- UNION ALL
-- SELECT 'Message_Labels', COUNT(*) FROM message_labels
-- UNION ALL
-- SELECT 'Email_Threads', COUNT(*) FROM email_threads
-- UNION ALL
-- SELECT 'AI_Processing_Logs', COUNT(*) FROM ai_processing_logs;

-- Sample query: User message counts with labels
-- SELECT 
--     u.name,
--     u.email,
--     COUNT(m.id) as total_messages,
--     COUNT(CASE WHEN m.is_read = 0 THEN 1 END) as unread_messages,
--     COUNT(CASE WHEN m.is_starred = 1 THEN 1 END) as starred_messages,
--     GROUP_CONCAT(DISTINCT l.name) as labels_used
-- FROM users u
-- LEFT JOIN messages m ON u.id = m.user_id
-- LEFT JOIN message_labels ml ON m.id = ml.message_id
-- LEFT JOIN labels l ON ml.label_id = l.id AND l.is_system = 0
-- GROUP BY u.id;

-- Sample query: AI processing performance
-- SELECT 
--     processing_type,
--     ai_provider,
--     COUNT(*) as total_processed,
--     ROUND(AVG(processing_time_ms), 2) as avg_time_ms,
--     ROUND(AVG(token_count), 2) as avg_tokens,
--     ROUND(SUM(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 2) as success_rate
-- FROM ai_processing_logs
-- GROUP BY processing_type, ai_provider
-- ORDER BY total_processed DESC;

-- Sample query: Most used labels
-- SELECT 
--     l.name,
--     l.color,
--     l.is_system,
--     COUNT(ml.message_id) as usage_count,
--     ROUND(COUNT(ml.message_id) * 100.0 / (SELECT COUNT(*) FROM message_labels WHERE label_id IN (SELECT id FROM labels WHERE user_id = l.user_id)), 2) as usage_percentage
-- FROM labels l
-- LEFT JOIN message_labels ml ON l.id = ml.label_id
-- WHERE l.user_id = 1  -- John Doe's labels
-- GROUP BY l.id
-- ORDER BY usage_count DESC;

-- Full-text search example
-- SELECT 
--     m.subject,
--     m.from_name,
--     m.snippet,
--     snippet(messages_fts, 0, '<mark>', '</mark>', '...', 32) as search_highlight
-- FROM messages_fts 
-- JOIN messages m ON messages_fts.rowid = m.id
-- WHERE messages_fts MATCH 'meeting OR project OR work'
-- AND m.user_id = 1
-- ORDER BY rank;