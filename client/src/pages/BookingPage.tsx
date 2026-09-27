import { useEffect, useState } from "react";

import TimezoneSelector from "../components/TimezoneSelector";
import SlotGrid from "../components/SlotGrid";
import { createBooking, getAvailableSlots } from "../services/api";
import type { BookingConfirmation, SelectedSlot } from "../types/booking";
import { getLocalTodayISODate } from "../utils/dateUtils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const convertTo24Hour = (time12: string): string => {
  const [time, modifier] = time12.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

export default function BookingPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"
  );

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<SelectedSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [booking, setBooking] = useState<BookingConfirmation | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!date) {
      setSlots([]);
      setSelectedTime("");
      return;
    }

    let cancelled = false;

    const loadSlots = async () => {
      try {
        setLoadingSlots(true);
        setError("");
        setSelectedTime("");

        const availableSlots = await getAvailableSlots(date, timezone);

        if (!cancelled) {
          setSlots(availableSlots);
        }
      } catch (err: any) {
        if (!cancelled) {
          setSlots([]);

          const message =
            err?.response?.data?.message ||
            "Unable to load available slots.";

          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    };

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [date, timezone]);

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return "Please enter your name.";
    }

    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!date) {
      return "Please select a date.";
    }

    if (!selectedTime) {
      return "Please select a time slot.";
    }

    return null;
  };

  const handleBooking = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setBookingLoading(true);
      setError("");

      const time24Hour = convertTo24Hour(selectedTime);

      const response = await createBooking({
        parent: {
          name: name.trim(),
          email: email.trim(),
          timezone,
        },
        date,
        time: time24Hour,
      });

      setBooking(response.booking);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.code === "ERR_NETWORK"
          ? "Unable to connect to the booking service. Please try again."
          : "Unable to book the trial class.");

      setError(message);
    } finally {
      setBookingLoading(false);
    }
  };

  const resetBooking = async () => {
    setBooking(null);
    setSelectedTime("");
    setError("");

    if (!date) {
      return;
    }

    /*
     * Refetch availability from the server rather than reusing
     * whatever was in state before the booking — the backend is
     * already correctly updated, the frontend just needs to ask
     * again instead of relying on a manual browser refresh.
     */
    try {
      setLoadingSlots(true);

      const updatedSlots = await getAvailableSlots(date, timezone);

      setSlots(updatedSlots);
    } catch (err: any) {
      setSlots([]);

      const message =
        err?.response?.data?.message ||
        "Unable to refresh available slots.";

      setError(message);
    } finally {
      setLoadingSlots(false);
    }
  };

  if (booking) {
    return (
      <div className="app">
        <main className="confirmation-card">
          <div className="success-icon">✓</div>

          <p className="eyebrow">BOOKING CONFIRMED</p>

          <h1>Your trial class is booked!</h1>

          <p className="confirmation-text">
            Your Codeyoung demo class has been successfully scheduled.
          </p>

          <div className="booking-details">
            <div className="detail-row">
              <span>Student</span>
              <strong>{booking.parent.name}</strong>
            </div>

            <div className="detail-row">
              <span>Mentor</span>
              <strong>{booking.mentor.name}</strong>
            </div>

            <div className="detail-row">
              <span>Your local time</span>
              <strong>{booking.parent.localTime}</strong>
            </div>

            <div className="detail-row">
              <span>Mentor's local time</span>
              <strong>{booking.mentor.localTime}</strong>
            </div>

            <div className="detail-row">
              <span>Timezone</span>
              <strong>{booking.parent.timezone}</strong>
            </div>

            <div className="detail-row">
              <span>Status</span>
              <strong className="status">{booking.status}</strong>
            </div>
          </div>

          <p className="email-sent-note">
            A confirmation email has been sent to{" "}
            <strong>{booking.parent.email}</strong>.
          </p>

          <a href={booking.meetingLink} className="meeting-button">
            Join Trial Class
          </a>

          <button
            type="button"
            className="secondary-button"
            onClick={resetBooking}
          >
            Book Another Class
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span>Codeyoung</span>
        </div>

        <span className="header-label">Free Trial Class</span>
      </header>

      <main className="page">
        <section className="hero">
          <div>
            <p className="eyebrow">WELCOME TO CODEYOUNG</p>

            <h1>
              Book your free
              <br />
              trial class.
            </h1>

            <p className="hero-text">
              Choose a convenient date and time. We'll match you with
              an available mentor and send your class details.
            </p>
          </div>

          <div className="hero-badge">
            <span>60</span>
            <small>MIN CLASS</small>
          </div>
        </section>

        <section className="booking-card">
          <div className="section-heading">
            <div>
              <span className="step-number">01</span>
              <h2>Your details</h2>
            </div>

            <span className="required-label">All fields required</span>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Full name</label>

              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="email">Email address</label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <TimezoneSelector value={timezone} onChange={setTimezone} />
          </div>

          <div className="section-heading schedule-heading">
            <div>
              <span className="step-number">02</span>
              <h2>Choose your schedule</h2>
            </div>
          </div>

          <div className="field date-field">
            <label htmlFor="date">Select date</label>

            <input
              id="date"
              type="date"
              value={date}
              min={getLocalTodayISODate()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {date && (
            <div className="slots-section">
              <div className="slots-header">
                <div>
                  <h3>Available times</h3>
                  <p>Times are shown in {timezone}</p>
                </div>

                <span className="duration">60 min</span>
              </div>

              <SlotGrid
                slots={slots}
                selectedTime={selectedTime}
                onSelect={setSelectedTime}
                loading={loadingSlots}
              />
            </div>
          )}

          {error && (
            <div className="error-message" role="alert">
              <span>!</span>
              {error}
            </div>
          )}

          <button
            type="button"
            className="book-button"
            onClick={handleBooking}
            disabled={bookingLoading}
          >
            {bookingLoading ? "Booking your class..." : "Book Free Trial Class"}
          </button>

          <p className="privacy-note">
            Your booking information is used only to arrange your
            trial class.
          </p>
        </section>
      </main>

      <footer>
        <span>© 2026 Codeyoung Trial Booking</span>
        <span>Secure scheduling • Timezone aware</span>
      </footer>
    </div>
  );
}
