// Date utility functions

// Date utility function to check if current date is within winter maintenance period
export function isWinterMaintenancePeriod(): boolean {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, so add 1
  const currentDay = now.getDate();
  
  // Winter maintenance period: November 15 to March 14
  const winterStart = { month: 11, day: 15 };
  const winterEnd = { month: 3, day: 14 };
  
  // Check if we're in the winter period
  if (currentMonth >= winterStart.month) {
    // November 15 onwards in current year
    return currentMonth > winterStart.month || 
           (currentMonth === winterStart.month && currentDay >= winterStart.day);
  } else if (currentMonth <= winterEnd.month) {
    // March 14 or earlier in current year
    return currentMonth < winterEnd.month || 
           (currentMonth === winterEnd.month && currentDay <= winterEnd.day);
  }
  
  return false;
}
