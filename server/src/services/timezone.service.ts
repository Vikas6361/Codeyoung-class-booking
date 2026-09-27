import { DateTime } from "luxon";

/**
 * Check whether an IANA timezone is valid.
 *
 * Examples:
 * Asia/Kolkata
 * America/New_York
 * Europe/London
 */
export const isValidTimezone = (
  timezone: string
): boolean => {
  return DateTime.now().setZone(timezone).isValid;
};

/**
 * Throw an error if the timezone is invalid.
 */
export const assertValidTimezone = (
  timezone: string
): void => {
  if (!isValidTimezone(timezone)) {
    throw new Error(
      `Invalid timezone: ${timezone}`
    );
  }
};

/**
 * Validate a local date + time in a specific timezone.
 *
 * This is important for Daylight Saving Time.
 */
export const validateLocalDateTime = (
  date: string,
  time: string,
  timezone: string
): DateTime => {
  assertValidTimezone(timezone);

  const requested = `${date}T${time}`;

  const localDateTime = DateTime.fromISO(
    requested,
    {
      zone: timezone,
      setZone: true,
    }
  );

  if (!localDateTime.isValid) {
    throw new Error(
      "The selected date or time is invalid."
    );
  }

  /*
   * Convert back to the requested format.
   *
   * If the local time does not exist because of a
   * DST transition, the round-trip value will differ.
   */
  const roundTrip = localDateTime.toFormat(
    "yyyy-MM-dd'T'HH:mm"
  );

  if (roundTrip !== requested) {
    throw new Error(
      "The selected local time does not exist because of a daylight-saving-time transition."
    );
  }

  return localDateTime;
};

/**
 * Convert a parent's/mentor's local date and time
 * into a UTC JavaScript Date.
 */
export const localTimeToUTC = (
  date: string,
  time: string,
  timezone: string
): Date => {
  const localDateTime =
    validateLocalDateTime(
      date,
      time,
      timezone
    );

  return localDateTime
    .toUTC()
    .toJSDate();
};

/**
 * Convert a UTC Date into a user's local timezone.
 *
 * Example:
 *
 * UTC:
 * 2026-09-28T14:00:00Z
 *
 * America/New_York:
 * 28 Sep 2026, 10:00 AM EDT
 */
export const convertUTCToTimezone = (
  utcDate: Date,
  timezone: string
): string => {
  assertValidTimezone(timezone);

  const localDateTime =
    DateTime.fromJSDate(
      utcDate,
      {
        zone: "utc",
      }
    ).setZone(timezone);

  if (!localDateTime.isValid) {
    throw new Error(
      `Unable to convert time to timezone: ${timezone}`
    );
  }

  return localDateTime.toFormat(
    "dd LLL yyyy, hh:mm a ZZZZ"
  );
};

/**
 * Get the local calendar date of a UTC
 * appointment in a particular timezone.
 *
 * Example:
 *
 * UTC:
 * 2026-09-28T23:30:00Z
 *
 * Asia/Kolkata:
 * 2026-09-29
 */
export const getLocalDate = (
  utcDate: Date,
  timezone: string
): string => {
  assertValidTimezone(timezone);

  const localDate =
    DateTime.fromJSDate(
      utcDate,
      {
        zone: "utc",
      }
    ).setZone(timezone);

  if (!localDate.isValid) {
    throw new Error(
      `Unable to determine local date for timezone: ${timezone}`
    );
  }

  return localDate.toISODate()!;
};