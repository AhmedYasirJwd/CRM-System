// Follow-up Logic - Calculates next platform and date

export const platformSequence = [
  { platform: "Instagram", dayOffset: 0 },   // Day 1
  { platform: "LinkedIn", dayOffset: 1 },    // Day 2
  { platform: "Facebook", dayOffset: 1 },    // Day 3
  { platform: "Email", dayOffset: 1 },       // Day 4
  { platform: "Instagram", dayOffset: 1 }    // Day 5 (final)
];

export function getNextFollowUp(client) {
  const { outreachHistory = [], platforms = [], status } = client;
  
  // If in convo or declined, no follow-up needed
  if (status === "in-convo" || status === "declined") {
    return null;
  }
  
  // If no outreach yet, suggest Instagram (Day 1)
  if (outreachHistory.length === 0) {
    return {
      platform: "Instagram",
      date: Date.now(),
      dayNumber: 1,
      reason: "First contact"
    };
  }
  
  // Get last outreach
  const lastOutreach = outreachHistory[outreachHistory.length - 1];
  
  // If they replied, no more follow-ups
  if (lastOutreach.status === "replied") {
    return null;
  }
  
  // Calculate next day
  const nextDay = lastOutreach.dayNumber + 1;
  
  // Max 5 attempts
  if (nextDay > 5) {
    return null;
  }
  
  // Get next platform from sequence
  const sequenceItem = platformSequence[nextDay - 1];
  if (!sequenceItem) return null;
  
  // Check if client has this platform
  if (!platforms.includes(sequenceItem.platform)) {
    // Skip to next day
    return getNextFollowUp({
      ...client,
      outreachHistory: [
        ...outreachHistory,
        { dayNumber: nextDay, platform: sequenceItem.platform, status: "skipped" }
      ]
    });
  }
  
  // Calculate next date (tomorrow at 9 AM)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  
  return {
    platform: sequenceItem.platform,
    date: tomorrow.getTime(),
    dayNumber: nextDay,
    reason: `Day ${nextDay} follow-up`
  };
}

export function getDaysUntilFollowUp(nextFollowUpDate) {
  if (!nextFollowUpDate) return null;
  
  const now = new Date();
  const followUpDate = new Date(nextFollowUpDate);
  const diffTime = followUpDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

export function formatFollowUpDate(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
