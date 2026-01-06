export interface CalendarEventParams {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
  allDay?: boolean; // If true, create an all-day event
}

class CalendarLinkService {
  /**
   * Format date to Google Calendar format (YYYYMMDDTHHmmssZ in UTC for timed events, YYYYMMDD for all-day)
   */
  private formatGoogleDate(date: Date, allDay: boolean = false): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    if (allDay) {
      return `${year}${month}${day}`;
    }
    
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Format date to Outlook Calendar format (ISO 8601 in local time, or YYYY-MM-DD for all-day)
   */
  private formatOutlookDate(date: Date, allDay: boolean = false): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (allDay) {
      return `${year}-${month}-${day}`;
    }
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Generate Google Calendar link
   */
  generateGoogleCalendarLink(params: CalendarEventParams): string {
    const { title, startDate, endDate, location = '', description = '', allDay = false } = params;

    // Format dates in UTC for Google Calendar
    const startFormatted = this.formatGoogleDate(startDate, allDay);
    const endFormatted = this.formatGoogleDate(endDate, allDay);
    const dates = `${startFormatted}/${endFormatted}`;

    const baseUrl = 'https://calendar.google.com/calendar/render';
    const queryParams = new URLSearchParams({
      action: 'TEMPLATE',
      dates: dates,
      text: title,
      location: location,
      details: description,
    });

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Generate Outlook Calendar link
   */
  generateOutlookCalendarLink(params: CalendarEventParams): string {
    const { title, startDate, endDate, location = '', description = '', allDay = false } = params;

    const startFormatted = this.formatOutlookDate(startDate, allDay);
    const endFormatted = this.formatOutlookDate(endDate, allDay);

    const baseUrl = 'https://outlook.live.com/calendar/0/action/compose';
    const queryParams = new URLSearchParams({
      allday: allDay ? 'true' : 'false',
      body: description,
      enddt: endFormatted,
      location: location,
      path: '/calendar/action/compose',
      rru: 'addevent',
      startdt: startFormatted,
      subject: title,
    });

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Generate both Google and Outlook calendar links
   */
  generateCalendarLinks(params: CalendarEventParams): {
    google: string;
    outlook: string;
  } {
    return {
      google: this.generateGoogleCalendarLink(params),
      outlook: this.generateOutlookCalendarLink(params),
    };
  }
}

// Export singleton instance
export const calendarLinkService = new CalendarLinkService();

