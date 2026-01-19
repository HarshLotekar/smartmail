/**
 * Smart Email Labeling
 * Fallback categorization when AI is unavailable
 */

/**
 * Categorize email based on sender, subject, and content
 * Returns one of: Work, Personal, Promotions, Social, Updates, Security, Spam, Education, Newsletter, Events
 */
export function smartLabelEmail(fromEmail, subject, snippet) {
  const email = (fromEmail || '').toLowerCase();
  const subj = (subject || '').toLowerCase();
  const text = (snippet || '').toLowerCase();
  const combined = `${email} ${subj} ${text}`;

  // Security - OTP, verification, password reset (HIGHEST PRIORITY)
  if (/\b(otp|verification code|verify your|reset password|2fa|two.?factor|security alert|suspicious activity|confirm your email|security code)\b/i.test(combined)) {
    return 'Security';
  }

  // Spam indicators (HIGH PRIORITY)
  if (/\b(congratulations you.?ve won|claim your prize|act now.*click|limited time offer.*urgent|viagra|pharmacy|nigerian prince)\b/i.test(combined) ||
      (email.includes('noreply') && /\b(click here now|verify immediately.*urgent)\b/i.test(combined))) {
    return 'Spam';
  }

  // Work - Professional domains and keywords
  if (/@(linkedin|ieee|kaggle|github|stackoverflow|researchgate|slack|atlassian|jira|confluence)\./.test(email) ||
      /\b(conference|cfp|call for papers|research|publication|job offer|interview|professional|meeting request|project|deadline|task)\b/i.test(combined)) {
    return 'Work';
  }

  // Education - Academic institutions
  if (/@(.+\.edu|coursera|udemy|edx|khanacademy|udacity|pluralsight)/.test(email) ||
      /\b(university|college|course|certification|academic|student|enrollment|semester|lecture|assignment)\b/i.test(combined)) {
    return 'Education';
  }

  // Social - Social media platforms
  if (/@(facebook|instagram|twitter|tiktok|snapchat|reddit|linkedin|pinterest|tumblr)\./.test(email) ||
      /\b(tagged you|liked your|commented on|friend request|new follower|connection request|mentioned you|reacted to your)\b/i.test(combined)) {
    return 'Social';
  }

  // Promotions - Sales and marketing (check before Updates to catch promotional updates)
  if (/\b(sale|discount|offer|deal|promo|coupon|% off|\d+% off|save \$|free shipping|black friday|cyber monday|limited time|exclusive offer|clearance)\b/i.test(combined) ||
      /@(marketing|promo|offers|deals|shop|store|retail)/.test(email) ||
      /\b(buy now|shop now|order now|get it now)\b/i.test(combined)) {
    return 'Promotions';
  }

  // Newsletter - Subscriptions and digests
  if (/\b(newsletter|digest|weekly roundup|monthly update|daily brief|bulletin|subscribe|unsubscribe)\b/i.test(combined) ||
      email.includes('newsletter') || email.includes('digest') || email.includes('bulletin')) {
    return 'Newsletter';
  }

  // Events - Invitations and registrations
  if (/\b(invite|invitation|rsvp|event|webinar|conference|meetup|register|registration|calendar|zoom meeting|teams meeting)\b/i.test(combined) ||
      /\b(join us|save the date|you.?re invited)\b/i.test(combined)) {
    return 'Events';
  }

  // Updates - Tracking, notifications, system updates
  if (/\b(order|shipped|tracking|delivery|notification|update|status|receipt|invoice|payment|transaction|confirmation)\b/i.test(combined) ||
      /@(noreply|no-reply|notification|notifications|updates?|alerts?)\./.test(email) ||
      /\b(your order|order number|shipment|package)\b/i.test(combined)) {
    return 'Updates';
  }

  // Personal - Default for Gmail, Yahoo, personal domains (ONLY if no other category matches)
  if (/@(gmail|yahoo|outlook|hotmail|icloud|protonmail|mail)\./.test(email)) {
    // Check if it's actually personal by looking for personal keywords
    if (/\b(hi|hello|hey|dear|thanks|thank you|regards|best|cheers)\b/i.test(combined) &&
        !/\b(order|tracking|sale|offer|deal|newsletter|digest)\b/i.test(combined)) {
      return 'Personal';
    }
    // If from common provider but has commercial keywords, don't default to Personal
    if (/\b(sale|offer|deal|promo|discount|order|shipping|subscription|unsubscribe)\b/i.test(combined)) {
      return 'Promotions'; // Likely a business using personal email service
    }
  }

  // Default fallback - be more conservative
  // If we can't determine, default to Updates for transactional, Personal for conversational
  if (/\b(hi|hello|hey|dear)\b/i.test(combined)) {
    return 'Personal';
  }
  
  return 'Updates'; // Changed default from 'Personal' to 'Updates' for unknown emails
}
