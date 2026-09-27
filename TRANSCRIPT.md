# TRANSCRIPT.md

# Codeyoung Full Stack Developer Assignment

## AI-Assisted Development & Engineering Decision Transcript

> This document consolidates the substantive AI-assisted development
> process for the Codeyoung Full Stack Developer assignment. Repetitive
> confirmations, trivial setup exchanges, and unrelated conversation are
> omitted. Technical findings, decisions, implementation changes,
> verification results, and limitations are retained without inventing
> unsupported work.

------------------------------------------------------------------------

## 1. Assignment Understanding

### Developer requirement

The project is a trial-class appointment booking system for a Codeyoung
Full Stack Developer recruitment assignment.

The required product behavior includes:

-   React frontend.
-   Node.js/Express backend.
-   10 mentors.
-   Maximum 2 demo classes per mentor per day.
-   Theoretical maximum capacity of 20 bookings per day.
-   Parent and mentor users may be in different timezones.
-   Correct timezone conversion.
-   Daylight Saving Time handling.
-   Automatic mentor assignment.
-   Dummy meeting/class link.
-   Sensible no-availability error.
-   Usable customer-facing product.
-   README and AI transcript.
-   Evaluation of architecture, design sense, customer perspective,
    scope decisions, and AI-assisted engineering quality.

### AI analysis

The implementation should be audited before being rewritten. Existing
architecture that is already correct should be preserved.

The highest-priority areas are scheduling correctness, timezone/DST
behavior, mentor capacity, double-booking protection, validation,
usability, security, testing, and documentation.

Optional features such as authentication, payment, real video
conferencing, or cancellation/rescheduling should not be added simply
because commercial scheduling products may contain them.

------------------------------------------------------------------------

# 2. Initial Codebase Audit

### Developer requirement

Inspect the complete existing project first. Do not modify the project
until the current implementation is understood.

### AI analysis

The backend follows a layered architecture:

``` text
Routes
   ↓
Controllers
   ↓
Services
   ↓
Models / Database
```

The main technology stack is:

**Frontend**

-   React
-   TypeScript
-   Vite
-   Axios

**Backend**

-   Node.js
-   TypeScript
-   Express
-   MongoDB
-   Mongoose
-   Luxon
-   Zod
-   Nodemailer

The existing architecture was considered a sound foundation and was
preserved rather than replaced.

### Finding

The core booking algorithm was substantially correct.

The reported concern that booking one slot could remove availability
from every other slot did not reproduce from the backend implementation.
Mentor availability was being calculated for each requested slot based
on the actual UTC instant, mentor working hours, existing booking
overlap, and daily capacity.

Several separate issues were found that were more important to fix.

------------------------------------------------------------------------

# 3. Initial Bugs Identified

### Finding

The audit identified the following issues:

1.  `client/vite.config.ts` was missing, preventing a normal frontend
    build.
2.  The backend generated a dummy meeting URL, but the frontend did not
    have a corresponding meeting route/page.
3.  The confirmation screen relied on local form state instead of the
    authoritative backend booking response.
4.  The frontend booking type did not match the actual backend response
    shape.
5.  The assigned mentor was therefore not correctly represented in the
    confirmation experience.
6.  Controller error classification relied on brittle message substring
    matching.
7.  DST validation errors could incorrectly become generic HTTP 500
    responses.
8.  The frontend minimum-date calculation used UTC through
    `toISOString()`, creating a local-date edge case for users in
    timezones behind UTC.
9.  The API base URL was hardcoded to localhost.
10. `.env.example`, Git ignore configuration, root documentation, and
    transcript documentation were missing.
11. Empty/dead scaffold files existed.
12. Express did not have a complete 404/global error-handling layer.
13. Client-side email validation was incomplete.
14. Responsive behavior required additional attention for narrower
    tablet layouts.

### Decision

Fix the actual issues while preserving the existing booking
architecture.

------------------------------------------------------------------------

# 4. Mentor Capacity Design

### Developer requirement

Each mentor can conduct at most two demo classes per day.

### AI analysis

The configuration uses:

``` text
Maximum classes per mentor per day = 2
Number of mentors = 10
```

Therefore:

``` text
10 × 2 = 20 theoretical bookings/day
```

The 20-booking value is a theoretical aggregate capacity. It does not
mean that every individual time slot will always have 20 mentors
available.

Daily capacity must be evaluated per mentor and according to that
mentor's local calendar day.

### Decision

Use a per-mentor daily capacity mechanism rather than a single global
booking counter.

------------------------------------------------------------------------

# 5. Exact-Slot Availability

### Developer question

If a mentor is booked at 5 PM, should the mentor disappear from the 6
PM, 7 PM, and 8 PM slots?

### AI analysis

No.

Availability must be calculated independently for each exact candidate
slot.

The availability process considers:

-   requested UTC instant;
-   mentor timezone;
-   mentor local working hours;
-   existing booking overlap;
-   mentor daily class count.

### Verification

The reported global-slot-removal issue did not reproduce from the actual
backend algorithm.

The expected behavior is:

``` text
5 PM booking
    ↓
5 PM: affected mentor becomes unavailable

6 PM
    ↓
availability remains independently calculated

7 PM
    ↓
availability remains independently calculated

8 PM
    ↓
availability remains independently calculated
```

The implementation therefore did not require a rewrite of the core
availability algorithm.

------------------------------------------------------------------------

# 6. Timezone Architecture

### Developer requirement

Parents and mentors may operate in different timezones.

### AI analysis

UTC should be the canonical representation for persisted booking
timestamps.

The flow is:

``` text
Parent local date/time
        ↓
Timezone conversion
        ↓
UTC
        ↓
Stored booking
```

When checking a mentor:

``` text
Stored/requested UTC time
        ↓
Mentor timezone
        ↓
Mentor local date/time
        ↓
Working-hours and daily-capacity checks
```

### Decision

Use UTC for the canonical booking timestamp while displaying local times
to the relevant user.

This prevents the database from depending on a particular user's
timezone and allows mentor working hours and local-day capacity to be
evaluated correctly.

------------------------------------------------------------------------

# 7. DST Validation

### Developer requirement

The system must correctly handle daylight-saving-time transitions.

### AI analysis

A local date/time is validated using a round-trip approach:

``` text
Local date/time
      ↓
Timezone
      ↓
UTC
      ↓
Convert back to original timezone
      ↓
Compare with requested local value
```

If the requested local value does not round-trip to itself, the local
time is treated as nonexistent.

### Example

For a spring-forward transition, a local hour such as:

``` text
02:00
```

may not exist.

The application should reject that requested local time rather than
silently changing it to another hour.

------------------------------------------------------------------------

# 8. DST Slot-Generation Bug

### Finding

A deeper review found a subtle slot-generation issue.

Using a simple Luxon hour-setting operation could normalize a
nonexistent DST local time into another valid hour. For example, a
nonexistent 02:00 could be normalized to 03:00.

That could cause two visible slots to represent the same UTC instant.

### Decision

Slot generation must validate each local candidate using the same
DST-aware logic used for booking validation.

### Verification

For the 2026 US spring-forward transition:

``` text
00:00 → valid
01:00 → valid
02:00 → excluded
03:00 → valid
04:00 → valid
```

The DST test produced:

``` text
23 valid hourly slots
23 unique UTC instants
```

A normal non-DST day continues to provide:

``` text
24 hourly slots
```

### Result

-   Nonexistent DST hour is excluded.
-   Duplicate UTC instants are avoided.
-   Normal days remain unaffected.

------------------------------------------------------------------------

# 9. Concurrency and Double-Booking Protection

### Developer requirement

The booking system must not allow a mentor to be double-booked or exceed
daily capacity under concurrent requests.

### AI analysis

The implementation uses multiple layers of protection.

#### Atomic daily capacity

The mentor's daily capacity is reserved through an atomic database
update.

The operation only succeeds while the mentor remains below the
configured daily limit.

#### Unique database constraint

A unique constraint protects the combination:

``` text
mentorId + startTimeUTC
```

This prevents two bookings from occupying the same mentor at the same
start time.

#### Overlap verification

The booking service performs a final overlap check before creating the
booking.

#### Capacity rollback

If capacity is reserved but booking creation fails, the reserved
capacity is released.

### Verification limitation

A live concurrent MongoDB race test was not fully executed in the AI
environment because the required MongoDB test environment could not be
established.

Therefore:

``` text
Concurrency protection was verified through implementation review,
atomic database logic, and database constraints.

A production-like live race test was not claimed as completed.
```

------------------------------------------------------------------------

# 10. Parent Duplicate Protection

### Finding

Parent records use normalized email handling and a unique database
constraint.

The booking flow also handles MongoDB duplicate-key errors.

### Decision

Keep database-level uniqueness rather than relying only on
application-level checks.

This protects against duplicate-parent creation during concurrent
first-time bookings.

------------------------------------------------------------------------

# 11. Backend Error Handling

### Finding

The original controller logic attempted to determine HTTP status codes
through brittle error-message substring matching.

For example, checking whether an error contained:

``` text
"invalid"
```

was insufficient for the DST error:

``` text
The selected local time does not exist because of a daylight-saving-time transition.
```

That message did not contain the expected substring and could therefore
be returned as a generic server error.

### Decision

Improve error handling so expected validation/scheduling errors return
appropriate client responses while unexpected failures remain server
errors.

A global error handler and 404 handler were also added.

### Result

The API now has clearer separation between:

``` text
Client/validation errors
```

and

``` text
Unexpected server errors
```

without exposing unnecessary internal details.

------------------------------------------------------------------------

# 12. Frontend Date Handling

### Finding

The frontend used:

``` ts
new Date().toISOString().split("T")[0]
```

to determine the minimum selectable date.

`toISOString()` represents UTC rather than the user's local calendar
date.

This can produce an incorrect date around midnight for users in
timezones behind UTC.

### Decision

Calculate the minimum date using the browser's local year, month, and
day.

### Result

The date picker now follows the user's local calendar date instead of
the UTC calendar date.

------------------------------------------------------------------------

# 13. Frontend API Configuration

### Finding

The API URL was hardcoded to:

``` text
http://localhost:5000/api
```

### Decision

Use an environment variable:

``` env
VITE_API_BASE_URL=http://localhost:5000/api
```

and provide a `.env.example`.

This makes local and future deployed environments configurable without
changing source code.

------------------------------------------------------------------------

# 14. Booking Response and Confirmation

### Finding

The frontend confirmation page originally relied on local state such as:

``` text
name
date
selectedTime
timezone
```

rather than the actual booking response returned by the server.

The frontend type also did not accurately represent the server's
response structure.

### Decision

Treat the backend response as the authoritative booking record.

The response contains information such as:

``` text
bookingId
parent
mentor
meetingLink
startTimeUTC
endTimeUTC
status
```

### Result

The confirmation screen can display the actual assigned mentor and
authoritative booking information instead of reconstructing it from
user-entered state.

------------------------------------------------------------------------

# 15. Dummy Meeting Room

### Finding

The backend generated a dummy meeting URL, but initially there was no
frontend route/page behind that URL.

### Decision

Implement a real frontend meeting route/page.

The assignment only requires a dummy class link, so a simulated meeting
room is sufficient.

### Scope decision

A real video-conferencing system was intentionally not implemented
because it is outside the stated assignment requirement.

------------------------------------------------------------------------

# 16. Email Notification Design

### AI analysis

The email service supports a development fallback so the application can
run without SMTP configuration.

For an actual SMTP configuration, two notification flows are supported:

### Parent confirmation

Contains:

-   parent name;
-   mentor name;
-   class time in the parent's timezone;
-   meeting link.

### Mentor notification

Contains:

-   mentor name;
-   parent information;
-   class time in the mentor's timezone;
-   meeting details.

### Limitation

Real Gmail SMTP delivery was not fully verified in the AI environment
because real credentials were not available for testing.

Therefore, the transcript does not claim successful live email delivery.

SMTP credentials must remain in `.env` and must never be committed to
the repository.

------------------------------------------------------------------------

# 17. CORS Debugging

### Developer observation

During local testing, the frontend was running on:

``` text
http://localhost:5174
```

while the backend was running on:

``` text
http://localhost:5000
```

The backend CORS configuration was allowing:

``` text
http://localhost:5173
```

### Finding

The browser rejected the API response because the frontend origin was
`5174` while the backend only allowed `5173`.

This was a development configuration problem, not a mentor-availability
problem.

### Decision

Allow the relevant Vite development origins in the backend CORS
configuration.

For local development:

``` text
localhost:5173
localhost:5174
```

can be allowed.

### Result

The CORS configuration matches the actual development frontend port.

------------------------------------------------------------------------

# 18. MongoDB Environment Debugging

### Developer observation

When the backend was restarted from the extracted project, it reported:

``` text
Error: MONGODB_URI is not defined
```

and:

``` text
injected env (0) from .env
```

### Finding

The backend was not receiving the required MongoDB environment variable.

### Required local configuration

The server `.env` should contain:

``` env
MONGODB_URI=<MongoDB connection string>
PORT=5000
CORS_ORIGIN=http://localhost:5174
FRONTEND_URL=http://localhost:5174
```

### Security decision

The actual MongoDB connection string and credentials must remain
private.

They should not be included in the transcript or GitHub repository.

------------------------------------------------------------------------

# 19. Security and Configuration

### Implemented / addressed

-   Environment-based configuration.
-   `.env` protection.
-   `.env.example`.
-   MongoDB credentials excluded from source control.
-   SMTP credentials excluded from source control.
-   Input validation.
-   CORS configuration.
-   Safe API error handling.
-   Rate limiting.
-   Database uniqueness constraints.

### Security scope

These measures represent production-oriented hardening appropriate to
the assignment.

The system should not be described as fully production-secure because
full production infrastructure, deployment security, monitoring, and
security testing are outside the verified scope.

------------------------------------------------------------------------

# 20. UI/UX and Customer Perspective

### Developer requirement

The product should be usable and should demonstrate customer-oriented
design.

### AI analysis

The parent journey should remain simple:

``` text
Enter details
      ↓
Select timezone
      ↓
Select date
      ↓
Select available time
      ↓
Book
      ↓
See assigned mentor
      ↓
Access meeting link
```

The interface should clearly communicate:

-   required fields;
-   timezone;
-   selected date;
-   available slots;
-   loading state;
-   unavailable state;
-   validation errors;
-   booking confirmation;
-   assigned mentor;
-   meeting access.

Responsive behavior and clear focus states were also considered.

### Scope decision

Authentication was not added because it would add friction without being
required for the core trial-booking flow.

Payment was not added because the assignment does not require it.

Real video conferencing was not added because a dummy meeting link
satisfies the stated requirement.

------------------------------------------------------------------------

# 21. Parent Daily Booking Limit

### Developer question

Should one parent be restricted to one booking per day?

### AI analysis

This was considered but is not explicitly required by the assignment.

Adding such a restriction without a defined product rule could
incorrectly prevent legitimate scenarios, for example a parent booking
for different children.

### Decision

Do not implement a one-parent-one-day restriction.

This is a deliberate product decision rather than an unfinished required
feature.

------------------------------------------------------------------------

# 22. Mentor Timezone Data

### AI analysis

The scheduling engine supports mentor timezones.

The seeded mentor data remains primarily India-based in accordance with
the project context.

The parent timezone selection still exercises cross-timezone scheduling.

Mentor timezone diversity was not added merely as artificial
demonstration data when it was not required.

------------------------------------------------------------------------

# 23. Rate Limiting

### Decision

Rate limiting was added as security hardening around API usage.

This protects booking and availability endpoints from excessive
requests.

It is an additional engineering improvement rather than a core business
requirement.

------------------------------------------------------------------------

# 24. Documentation and Repository Hygiene

### Required documentation

The project was prepared with:

-   root `README.md`;
-   `TRANSCRIPT.md`;
-   `.env.example`;
-   `.gitignore`.

### Repository hygiene

The following should not be committed:

``` text
.env
node_modules/
dist/
database credentials
SMTP passwords
other secrets
```

The README should explain:

-   project architecture;
-   setup;
-   environment variables;
-   running frontend/backend;
-   database setup;
-   mentor seeding;
-   key scheduling rules;
-   testing;
-   known limitations.

------------------------------------------------------------------------

# 25. Testing and Verification

## A. Actually verified

The following areas were verified during the AI-assisted development
process:

### Build/type validation

The project was checked through fresh dependency installation/build
validation after the implementation changes.

### Slot availability logic

The actual per-slot logic was traced and tested to confirm that booking
one slot does not incorrectly remove unrelated slots.

### DST validation

The spring-forward edge case was tested.

The nonexistent local hour was excluded.

### DST slot count

Spring-forward day:

``` text
23 valid hourly slots
23 unique UTC instants
```

Normal day:

``` text
24 hourly slots
```

### API and frontend contract

The frontend booking type and confirmation flow were aligned with the
backend response.

------------------------------------------------------------------------

## B. Verified through code review/reasoning

The following were verified through implementation review and database
logic:

-   atomic daily capacity;
-   unique mentor/start-time constraint;
-   overlap checks;
-   capacity rollback;
-   parent email uniqueness;
-   timezone conversion architecture;
-   error-handling structure.

------------------------------------------------------------------------

## C. Not fully verified in the AI environment

### Concurrent MongoDB race testing

A production-like live concurrent race test was not completed because
the required MongoDB test environment could not be established.

### Real Gmail delivery

Real SMTP delivery was not fully tested with live Gmail credentials.

### Visual user testing

The AI environment did not replace actual human usability testing. The
UI was reviewed from code and design behavior, but no formal external
user study is claimed.

------------------------------------------------------------------------

## D. Recommended final manual tests

Before submission, the developer should manually verify:

1.  Normal booking.
2.  Second booking for the same mentor on the same day.
3.  Attempted third booking for that mentor.
4.  Different-slot availability after a booking.
5.  Parent timezone conversion.
6.  Mentor timezone/local-day behavior.
7.  DST spring-forward case.
8.  Past-time rejection.
9.  No-mentor-available case.
10. Meeting-link navigation.
11. Parent/mentor email delivery if SMTP is configured.
12. Frontend/backend CORS configuration.
13. MongoDB environment configuration.
14. Responsive behavior on desktop and mobile-sized screens.

------------------------------------------------------------------------

# 26. What Was Intentionally Not Built

The following were deliberately kept outside the assignment scope:

-   Authentication/login.
-   Payment processing.
-   Real video-conferencing integration.
-   Full cancellation/rescheduling workflow.
-   Administrative dashboard.
-   Production CI/CD pipeline.
-   Production monitoring infrastructure.
-   Email retry/queue infrastructure.
-   One-parent-one-day booking restriction.

These are not treated as failures because they were not required to
demonstrate the core booking system.

------------------------------------------------------------------------

# 27. Requirement-to-Implementation Mapping

  -----------------------------------------------------------------------
  Assignment requirement              Implementation / status
  ----------------------------------- -----------------------------------
  React frontend                      Implemented

  Node.js/Express backend             Implemented

  10 mentors                          Implemented

  Maximum 2 classes per mentor/day    Implemented

  20 theoretical daily capacity       Implemented through 10 × 2 capacity

  Automatic mentor assignment         Implemented

  Exact-slot availability             Implemented

  Parent/mentor timezone differences  Implemented

  UTC canonical storage               Implemented

  DST handling                        Implemented

  DST slot-generation validation      Implemented

  Double-booking protection           Implemented through atomic/database
                                      protections

  Dummy meeting link                  Implemented

  Working dummy meeting page          Implemented

  Sensible no-availability error      Implemented

  Parent/mentor email architecture    Implemented

  Input validation                    Implemented

  CORS configuration                  Implemented

  Rate limiting                       Implemented

  Responsive customer-facing UI       Implemented

  README                              Implemented

  AI transcript                       Implemented

  Authentication                      Intentionally out of scope

  Payment                             Intentionally out of scope

  Real video call                     Intentionally out of scope

  Cancellation/rescheduling           Intentionally out of scope
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 28. Final Engineering Assessment

The development process followed an iterative engineering workflow:

``` text
Requirement
    ↓
Inspect existing implementation
    ↓
Challenge the reported behavior
    ↓
Trace the actual code path
    ↓
Identify real defects
    ↓
Choose the smallest correct architectural fix
    ↓
Implement
    ↓
Verify
    ↓
Document limitations
    ↓
Review remaining scope
```

A significant part of the work was deciding **what not to change**.

The reported slot-availability issue did not reproduce in the backend
implementation, so the booking algorithm was not unnecessarily
rewritten.

Instead, actual issues were identified and addressed:

-   missing build configuration;
-   missing meeting route;
-   stale confirmation state;
-   frontend/backend type mismatch;
-   local-date handling;
-   DST slot normalization;
-   brittle error classification;
-   API configuration;
-   environment configuration;
-   repository hygiene;
-   CORS configuration.

The resulting architecture preserves separation of concerns while
improving correctness, customer usability, validation, security
hardening, and documentation.

The most important engineering principles demonstrated are:

1.  Inspect before modifying.
2.  Verify a reported bug instead of assuming it is real.
3.  Keep scheduling time canonical in UTC.
4.  Evaluate mentor availability at the exact requested slot.
5.  Treat DST as a first-class scheduling edge case.
6.  Use database constraints and atomic operations for critical capacity
    rules.
7.  Keep frontend state consistent with authoritative backend responses.
8.  Separate required features from optional product ideas.
9.  Distinguish actual test results from code-review reasoning.
10. Document limitations honestly.
