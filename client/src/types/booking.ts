export interface SelectedSlot {
  time: string;
  startTimeUTC: string;
  timezone: string;
  availableMentors: number;
  available: boolean;
}

/**
 * Shape returned by POST /api/bookings.
 *
 * This mirrors exactly what booking.service.ts returns —
 * a nested parent/mentor confirmation object, not the raw
 * Mongoose Booking document.
 */
export interface BookingConfirmation {
  bookingId: string;

  parent: {
    name: string;
    email: string;
    timezone: string;
    localTime: string;
  };

  mentor: {
    id: string;
    name: string;
    email: string;
    timezone: string;
    localTime: string;
  };

  meetingLink: string;

  startTimeUTC: string;
  endTimeUTC: string;

  status: string;
}
