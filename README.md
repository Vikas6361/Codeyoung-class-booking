# Codeyoung Trial Class Booking System

A full-stack trial-class appointment booking system built for the **Codeyoung Full-Stack Developer recruitment assignment**.

Parents can select a date, time, and timezone. The system finds an available mentor, creates the booking, generates a simulated meeting link, and can send confirmation emails to the parent and mentor when SMTP is configured.

---

## Overview

- **10 active mentors**, using `Asia/Kolkata` as the mentor timezone.
- Each mentor can conduct a maximum of **2 demo classes per local calendar day**.
- The system supports **up to 20 bookings per day** through the 10 × 2 capacity model.
- Parents can select **any IANA timezone**.
- Parent local time is converted to UTC for booking and storage.
- Mentor working hours are checked in the **mentor's own timezone**.
- **DST-aware** slot generation and booking validation.
- Automatic mentor assignment with load balancing.
- Database-level protection against duplicate bookings and capacity races.
- Simulated meeting room at `/meeting/:id`.
- Basic rate limiting on availability and booking endpoints.
- Responsive frontend for mobile and desktop.

---

## Features

### Booking

- Book a trial class using parent name, email, timezone, date, and time slot.
- Real-time availability is retrieved from the backend.
- The system displays the number of mentors available for each slot.
- A mentor is automatically assigned after booking.

### Mentor Management

- 10 active demo mentors are seeded into MongoDB.
- Mentors work from **9:00 AM to 9:00 PM local time**.
- Each mentor can conduct a maximum of **2 classes per local calendar day**.
- Mentors are selected using their current daily booking count.
- When multiple mentors have the same lowest load, one is selected from the tied candidates.

### Timezone and DST

- Parent times are interpreted using the selected IANA timezone.
- Bookings are stored in UTC.
- Mentor working hours are evaluated in the mentor's own timezone.
- Confirmation times are converted back to the relevant person's timezone.
- Nonexistent DST times during spring-forward transitions are rejected.
- Ambiguous fall-back times are handled deterministically.

### Booking Confirmation

The confirmation page displays:

- Parent details
- Assigned mentor
- Parent local time
- Mentor local time
- Meeting link
- Email confirmation status

Confirmation data comes from the **server response**, rather than stale frontend form state.

### Meeting Room

The application provides a simulated meeting page:

```text
/meeting/:id
```

The **Join Trial Class** button opens this page using the generated meeting ID.

### Email Notifications

When SMTP is configured, two separate emails are sent:

1. **Parent confirmation**
   - Subject: `Your Codeyoung Trial Class is Confirmed`
   - Contains the assigned mentor, class time, timezone, and meeting link.

2. **Mentor assignment**
   - Subject: `New Codeyoung Trial Class Assigned`
   - Contains student details, mentor-local class time, timezone, and meeting link.

When SMTP is not configured, the application uses a development console-log fallback instead of failing the booking.

### Validation and Error Handling

The backend validates booking requests with Zod.

Customer-friendly errors are provided for:

- Invalid input
- Invalid timezone
- Invalid date/time
- DST conflicts
- No available mentors
- Slot taken by another request
- Rate limiting
- Backend/network errors

Raw server stack traces are not returned to the frontend.

---

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Axios
- Lucide React

### Backend

- Node.js
- TypeScript
- Express 5
- MongoDB
- Mongoose
- Zod
- Luxon
- Nodemailer

---

## Architecture

```text
Frontend

React Pages / Components
          |
          v
     Axios API Client
          |
          v
       REST API
          |
          v
Backend

Routes
  |
  v
Controllers
  |
  v
Services
  |
  v
Models
  |
  v
MongoDB
```

Controllers remain thin and handle request validation and response shaping.

Business logic is kept inside the service layer, including booking, mentor availability, slot generation, timezone conversion, capacity management, and email notifications.

---

## Project Structure

```text
codeyoung-class-booking/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── vite.config.ts
│
├── server/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── seed/
│       │   └── mentors.ts
│       ├── services/
│       │   ├── booking.service.ts
│       │   ├── mentor.service.ts
│       │   ├── slot.service.ts
│       │   ├── capacity.service.ts
│       │   ├── timezone.service.ts
│       │   └── email.service.ts
│       └── utils/
│           └── meetingLink.ts
│
├── docs/
│   └── screenshots/
│
├── README.md
├── TRANSCRIPT.md
└── .gitignore
```

---

## Booking Flow

1. The parent enters their name, email, timezone, and date.
2. The frontend requests available slots from the backend.
3. The backend generates hourly slots for the selected date and timezone.
4. Each slot is converted to UTC.
5. Available mentors are checked for that UTC time.
6. The frontend displays slots that have at least one available mentor.
7. The parent selects a slot and submits the booking.
8. The backend validates the request again.
9. The selected local date/time is converted to UTC.
10. Available mentors are checked again.
11. Mentors are sorted by their current daily booking count.
12. The system atomically reserves mentor daily capacity.
13. The booking is checked again for an exact overlap.
14. The booking is created in MongoDB.
15. A unique meeting link is generated.
16. Email notifications are sent when SMTP is configured.
17. The server returns the booking confirmation.
18. The frontend displays the server-provided confirmation.
19. **Book Another Class** refreshes availability from the backend.

---

## Timezone Handling

The application uses **Luxon** and IANA timezone identifiers.

```text
Parent timezone
      |
      v
Local date + local time
      |
      v
     UTC
      |
      +--------------------+
      |                    |
      v                    v
Mentor timezone       Database
      |                    |
      v                    v
Working hours        startTimeUTC
and local date       endTimeUTC
```

Rules:

- Parent date/time is interpreted in the parent's selected timezone.
- The resulting instant is converted to UTC.
- All bookings are stored using UTC timestamps.
- Mentor working hours are checked using the mentor's timezone.
- Displayed times are converted from UTC to the appropriate person's timezone.

---

## DST Handling

DST transitions are handled explicitly.

### Spring Forward

Some local times do not exist during a spring-forward transition.

The application checks the requested local time by converting it to the timezone and round-tripping it back.

If the resulting local time does not match the requested time, the time is treated as nonexistent and rejected.

The same validation is performed while generating available slots so nonexistent hours are not displayed.

### Fall Back

During a fall-back transition, an hour can occur twice.

The application resolves the ambiguous local time deterministically so that the slot list does not display confusing duplicate entries.

The implementation was checked against the 2026 US DST transitions:

- March 8, 2026 — spring forward
- November 1, 2026 — fall back

Detailed verification is documented in `TRANSCRIPT.md`.

---

## Mentor Capacity

Each mentor has a maximum of **2 classes per local calendar day**.

The day is calculated using the **mentor's timezone**, not the parent's timezone, server timezone, or UTC.

The system converts the booking's UTC start time to the mentor's timezone before determining the mentor's local date.

---

## Mentor Assignment

For a requested class time, the backend checks every active mentor for:

- Working hours
- Existing overlapping bookings
- Daily booking count
- Mentor local calendar date

Available mentors are sorted by their current number of classes for that local day.

The mentor with the lowest load is preferred. If multiple mentors have the same lowest load, one of the tied mentors is selected.

This spreads demo classes across the mentor pool.

---

## Concurrency Protection

The booking process uses database-level protection instead of relying only on application memory.

### Daily Capacity

`MentorDailyCapacity` uses an atomic MongoDB update with:

```text
bookingCount < 2
$inc bookingCount
```

This prevents the daily counter from exceeding the configured capacity during concurrent requests.

### Booking Uniqueness

The `Booking` collection has a unique compound index:

```text
{ mentorId, startTimeUTC }
```

This provides database-level protection against two confirmed bookings for the same mentor at the same instant.

### Testing Note

A live simultaneous-request concurrency test was not executed against a production-like MongoDB instance during development.

The concurrency protection was verified by inspecting the actual database operations and indexes.

---

## Email Notifications

Nodemailer is used for SMTP email delivery.

The email transporter is created lazily when first needed.

### Development Mode

If SMTP credentials are not configured, the application logs the email information instead of failing the booking.

### Configured SMTP

When SMTP is configured:

- A parent confirmation email is sent.
- A mentor assignment email is sent.

Email failure does not roll back an already-created booking. The booking remains available through the confirmation screen.

---

## Database Schema

### Mentor

```text
name
email
timezone
isActive
```

The email field is unique.

### Parent

```text
name
email
timezone
```

The email field is unique.

If two simultaneous first-time bookings use the same parent email, the duplicate-key case is handled by re-fetching the existing parent record.

### Booking

```text
parentId
mentorId
startTimeUTC
endTimeUTC
parentTimezone
mentorTimezone
meetingLink
status
```

Unique index:

```text
{ mentorId, startTimeUTC }
```

### MentorDailyCapacity

```text
mentorId
localDate
bookingCount
```

Unique index:

```text
{ mentorId, localDate }
```

The booking count is limited to the configured maximum of 2.

---

## API Endpoints

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| GET | `/api/health` | Health check | None |
| GET | `/api/slots` | Available hourly slots for date and timezone | 60/min/IP |
| GET | `/api/mentors/availability` | Mentor availability for an exact date/time/timezone | 60/min/IP |
| POST | `/api/bookings` | Create a trial-class booking | 10/min/IP |

Common error response:

```json
{
  "success": false,
  "message": "Customer-friendly error message"
}
```

Validation errors may also contain Zod validation details.

Rate-limited requests return HTTP `429`.

---

## Environment Variables

### Backend

Create:

```text
server/.env
```

using:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/codeyoung-trial-booking
PORT=5000
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
```

SMTP variables can remain blank during local development.

### Frontend

Create:

```text
client/.env
```

with:

```text
VITE_API_BASE_URL=http://localhost:5000/api
```

Never commit real credentials to GitHub.

---

## Local Setup

### Prerequisites

Install:

- Node.js 18 or newer
- MongoDB

MongoDB can be installed locally, run using Docker, or hosted using MongoDB Atlas.

### 1. Clone the Repository

```bash
git clone https://github.com/Vikas6361/Codeyoung-class-booking.git
cd Codeyoung-class-booking
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

On Windows, you can also create `.env` manually by copying `.env.example`.

Update `MONGODB_URI` if required.

Seed the 10 mentors:

```bash
npm run seed:mentors
```

Start the backend:

```bash
npm run dev
```

Backend:

```text
http://localhost:5000
```

### 3. Frontend Setup

Open a second terminal:

```bash
cd client
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Start the frontend:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

### 4. Open the Application

Open:

```text
http://localhost:5173
```

Make sure MongoDB, the backend, and the frontend are running and the mentors have been seeded.

---

## Testing

The repository does not currently include an automated test suite.

The booking, timezone, capacity, validation, and frontend flows were manually verified during development using the actual application and service functions.

| Test | Result |
|---|---|
| Normal booking end-to-end | Pass |
| Repeated booking of one slot | Pass |
| Fully booked slot disappears | Pass |
| Booking one slot does not affect unrelated slots | Pass |
| Mentor maximum of 2 classes per local day | Pass |
| Mentor becomes available again on the next local day | Pass |
| Mentor local-date capacity calculation | Pass |
| Parent timezone to UTC conversion | Pass |
| Mentor timezone conversion | Pass |
| DST spring-forward nonexistent time rejected | Pass |
| DST nonexistent time excluded from slots | Pass |
| DST fall-back ambiguous time handled deterministically | Pass |
| No-availability response | Pass |
| Application without SMTP configuration | Pass |
| Meeting room navigation | Pass |
| Book Another Class refreshes availability | Pass |
| Mobile responsiveness | Pass |
| Invalid form input handling | Pass |
| Backend unavailable error handling | Pass |
| Live concurrent booking test | Not performed |
| Live SMTP delivery test | Not performed |

### Concurrency Verification

A live two-request concurrency test was not performed against a production-like MongoDB environment.

The implementation was verified through the actual database logic:

- Atomic `findOneAndUpdate`
- `bookingCount < 2`
- `$inc`
- Unique `{ mentorId, startTimeUTC }` index
- Unique `{ mentorId, localDate }` capacity index

A production deployment should include an actual concurrent-load test.

### Email Verification

SMTP delivery was not live-tested because real SMTP credentials were not available during development.

The application was tested with SMTP disabled, where email information is logged instead of causing booking failure.

---

## Design Decisions

### Mentor Timezone

All seeded mentors use:

```text
Asia/Kolkata
```

This follows the assignment's stated operating model where mentors are based in India while parents may be in different countries.

The parent timezone selector accepts any IANA timezone, allowing cross-timezone behavior to be demonstrated without artificially assigning different timezones to the demo mentors.

### Mentor Working Hours

Working hours are evaluated in the mentor's own timezone.

This avoids incorrectly applying the parent's timezone to mentor availability.

### Per-Slot Availability

Availability is calculated independently for each time slot.

Booking one slot does not globally reduce the mentor count for unrelated slots.

### Atomic Capacity

Daily capacity is protected at the database level rather than with an in-memory counter.

This is safer when asynchronous requests overlap or when multiple server instances are used.

### Server-Authoritative Confirmation

The confirmation screen uses the booking returned by the backend.

This ensures that the displayed mentor and times reflect the actual booking rather than stale frontend state.

### Meeting Room

The meeting link opens a real React route instead of being a dead placeholder link.

The meeting page is simulated because a real video-conferencing provider is outside the assignment scope.

### No Per-Parent Daily Limit

The assignment does not specify a maximum number of bookings per parent per day.

Therefore, a per-parent daily limit was not added as a required business rule.

---

## Security Considerations

- `.env` is ignored by Git.
- Only `.env.example` is committed.
- MongoDB and SMTP credentials are not hard-coded.
- Secrets are never sent to the frontend.
- CORS is configurable and restricted to the configured frontend origin.
- Backend input is validated using Zod.
- Frontend validation is only for user experience; the server remains authoritative.
- Error responses do not expose stack traces.
- A global error handler handles unexpected server errors.
- Mongoose query builders are used instead of constructing raw query strings.
- Basic per-IP rate limiting is applied to booking and availability endpoints.

---

## Limitations

- No authentication or user accounts are implemented.
- Anyone with access to the application can attempt to book an available slot.
- The meeting room is simulated; there is no real video-conferencing integration.
- There is no automated unit/integration test suite yet.
- Live SMTP delivery was not tested because credentials were unavailable during development.
- Live simultaneous-request concurrency testing was not performed against a production-like MongoDB environment.
- The demo mentors are seeded with the same `Asia/Kolkata` timezone.

These limitations are intentionally documented rather than presented as implemented functionality.

---

## Future Improvements

Possible production improvements include:

- Parent authentication and account management
- Admin dashboard
- Mentor dashboard
- Real video-conferencing integration
- Automated unit and integration tests
- Automated concurrency/load testing
- Production monitoring and structured logging
- Calendar integration
- Booking cancellation and rescheduling
- More advanced availability rules
- Per-parent booking limits if required by the product

---

## Screenshots

Screenshots are available in:

```text
docs/screenshots/
```

Recommended screenshots included in the repository:

- Booking Page
- Available Time Slots
- Booking Confirmation
- Timezone Support
- Trial Class Meeting Room
- Responsive Mobile UI

---

## AI-Assisted Development

AI tools were used during development for:

- Architecture discussion
- Code generation and refinement
- Debugging
- Timezone and DST reasoning
- Concurrency review
- Database design review
- Frontend UX improvements
- Testing guidance
- README documentation
- Final code review

The AI session transcript is available in:

```text
TRANSCRIPT.md
```

The transcript documents the development discussions and technical decisions made during the project.

---

## Submission

This project was developed as part of the **Codeyoung Full-Stack Developer recruitment assignment**.

## Screenshots

### Booking Page
![Booking Page](docs/screenshots/booking-page.png)

### Available Time Slots
![Available Slots](docs/screenshots/available-slots.png)

### Booking Confirmation
![Booking Confirmation](docs/screenshots/booking-confirmation.png)

### Timezone Support
![Timezone Support](docs/screenshots/timezone-support.png)

### Trial Class Meeting Room
![Meeting Room](docs/screenshots/meeting-room.png)

### Responsive Mobile UI
![Mobile View](docs/screenshots/mobile-view.png)

---

\---

GitHub repository:

https://github.com/Vikas6361/Codeyoung-class-booking
