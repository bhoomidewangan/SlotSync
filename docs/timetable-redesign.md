# SlotSync Timetable Redesign

This document is the source of truth for the timetable redesign.

Key decisions:

- Use one fixed Monday–Friday timetable template.
- Each day has five periods, lunch, then five periods.
- Use an AI API for schedule generation; do not use the existing CSP solver.
- Send the AI only the selected semester’s courses and availability of teachers involved in those courses.
- Keep generated proposals temporary until accepted or rejected.
- Store only one accepted timetable per semester.
- Update teacher bookings only after acceptance.
- Do not include academic-term support at this stage.
- Do not provide an automatic Regenerate action.

Below is the complete change list based on our agreed design.

## 1. Replace configurable scheduling with a fixed template

Create one backend constant defining:

- Monday through Friday
- Periods `P1–P5`
- Lunch break
- Periods `P6–P10`
- Fixed start/end times for every period
- Stable slot IDs such as `MON_P1`, `TUE_P7`

The frontend should consume or mirror this template only for display. Users should not be able to edit it.

## 2. Remove the configuration feature

The following configuration-related functionality is no longer needed:

- Remove the Configure page and navigation item.
- Remove `ConfigForm`.
- Remove configuration API methods from `timetableService`.
- Remove `configId` from Zustand.
- Remove `/api/config` routes and controllers.
- Retire the `ScheduleConfig` model.
- Remove the required `config` reference from the `Timetable` model.
- Update dashboard links that currently point to Configure.

Existing configuration data can either be ignored or removed during migration.

## 3. Retire the CSP scheduler

Remove the timetable controller’s dependency on `generateSchedule`.

The following algorithm files can be removed after the AI implementation is working:

- `algorithm/index.js`
- `algorithm/cspSolver.js`
- `algorithm/constraintChecker.js`
- `algorithm/slotBuilder.js`

The fixed timetable template and deterministic validator will replace the slot-building and constraint-checking portions. The AI API will replace schedule proposal generation.

## 4. Add an AI scheduling service

Create a server-side provider abstraction such as:

```text
services/aiSchedulerService.js
```

Its responsibilities:

- Build the scheduling request.
- Call the selected AI API.
- Require structured JSON output.
- Parse and validate the response format.
- Handle timeouts and provider failures.
- Optionally ask the AI to repair an invalid response once or twice.

Required environment variables will likely include:

```text
AI_API_KEY
AI_MODEL
```

The API key must remain on the backend.

## 5. Send only relevant data to the AI

For a request to generate Semester 3:

1. Load Semester 3 courses.
2. Populate their assigned teachers.
3. Extract the unique involved teacher IDs.
4. Load existing bookings only for those teachers.
5. Exclude bookings belonging to the current Semester 3 timetable.
6. Convert the remaining bookings into blocked slot IDs.
7. Send the courses and blocked slots to the AI.

Do not send:

- Unrelated teachers
- Unrelated courses
- Complete timetables for other semesters
- Department email or other unnecessary data

Example AI input:

```json
{
  "semester": 3,
  "courses": [
    {
      "courseId": "course-1",
      "teacherId": "teacher-1",
      "sessionsPerWeek": 3,
      "periodsPerSession": 1
    }
  ],
  "teacherBlockedSlots": {
    "teacher-1": ["MON_P1", "TUE_P4"]
  }
}
```

## 6. Add a `TeacherBooking` model

Do not store simple booleans inside the teacher document. A boolean cannot identify which timetable or course owns a booking.

Use a separate model:

```js
{
  department,
  teacher,
  timetable,
  semester,
  course,
  day,
  period,
  slotId
}
```

Add a unique compound index:

```js
teacherBookingSchema.index(
  {
    department: 1,
    teacher: 1,
    day: 1,
    period: 1,
  },
  { unique: true }
)
```

This is the final database-level protection against cross-semester teacher conflicts.

Because we are intentionally not introducing academic terms, these bookings represent the single currently active timetable cycle. They will need to be cleared manually when starting a completely new cycle or year.

## 7. Update the `Timetable` model

The model should represent only accepted timetables.

Suggested fields:

```js
{
  department,
  semester,
  schedule,
  generatedAt,
  acceptedAt
}
```

Remove the `config` field.

Add a unique index:

```js
timetableSchema.index(
  {
    department: 1,
    semester: 1,
  },
  { unique: true }
)
```

This guarantees only one accepted timetable per semester and department.

## 8. Change generation into preview generation

Update:

```http
POST /api/timetable/generate
```

Request:

```json
{
  "semester": 3
}
```

This endpoint should:

1. Validate the semester.
2. Load courses and relevant teachers.
3. Load blocked slots for those teachers.
4. Exclude the target semester’s existing timetable bookings.
5. Call the AI API.
6. Validate the AI response.
7. Return the temporary proposal.
8. Make no timetable or booking database changes.

The existing behavior that deletes and immediately creates a timetable during generation must be removed.

## 9. Keep proposals temporary

For the initial implementation, keep the proposal only in frontend memory.

Add non-persisted state such as:

```js
timetableProposal: null
setTimetableProposal()
clearTimetableProposal()
```

Do not include the proposal in Zustand’s persisted fields.

Consequences:

- Refreshing the page discards the proposal.
- Rejecting clears it immediately.
- Nothing is added to MongoDB before acceptance.
- The accepted timetable remains active while the proposal is displayed.

For security, return a short-lived proposal signature or token with the generated result. On acceptance, the server should verify that the submitted proposal is the exact proposal it generated.

Redis with an expiry can replace client-side proposal storage later if proposals must survive page refreshes.

## 10. Add a deterministic schedule validator

The AI must not decide whether its own response is valid.

Create a backend validator that checks:

- Only Monday through Friday are used.
- Only `P1–P10` are used.
- Lunch is never assigned.
- Every course belongs to the selected semester and department.
- Every teacher is actually assigned to the submitted course.
- Required sessions per week are satisfied exactly.
- Consecutive sessions remain consecutive.
- Consecutive sessions do not cross lunch.
- A semester has only one course in any slot.
- A teacher is not assigned to a blocked slot.
- A teacher is not assigned twice in the generated proposal.
- There are no duplicate or unknown course, teacher, or slot IDs.
- The same course is not scheduled twice on one day, if that rule is retained.

Run this validator:

1. Immediately after the AI response.
2. Again during acceptance using the latest database bookings.

## 11. Add an acceptance endpoint

Create:

```http
POST /api/timetable/accept
```

Request:

```json
{
  "semester": 3,
  "proposal": {},
  "proposalToken": "..."
}
```

The endpoint should:

1. Authenticate the department.
2. Verify the proposal token/signature.
3. Reload courses and relevant teacher bookings.
4. Exclude bookings belonging to Semester 3’s existing timetable.
5. Revalidate the proposal against current data.
6. Start a MongoDB transaction.
7. Remove teacher bookings belonging to the old Semester 3 timetable.
8. Replace or upsert the Semester 3 timetable.
9. Create the new teacher booking records.
10. Commit the transaction.
11. Return the accepted timetable.

If anything fails, roll back everything and preserve the old timetable and its bookings.

MongoDB must support transactions, normally through a replica set or MongoDB Atlas.

## 12. Handle rejection entirely as a temporary action

Rejecting should:

- Clear the proposal from frontend memory.
- Return the interface to its normal state.
- Leave the accepted timetable unchanged.
- Leave teacher bookings unchanged.

A rejection API endpoint is unnecessary when proposals exist only in frontend memory. If Redis is introduced later, rejection should delete the Redis proposal.

## 13. Update timetable deletion

If timetable deletion remains supported, deleting a timetable must also delete its `TeacherBooking` records inside a transaction.

If users should always have one accepted timetable once created, the public deletion endpoint and UI can be removed entirely.

## 14. Redesign the timetable frontend flow

The timetable page should support these states:

```text
Idle → Generating → Preview → Accepted or Rejected
```

### Normal state

- Show the currently accepted timetable, if one exists.
- Show a “Generate Timetable” or “Generate New Proposal” button.
- Allow semester selection.
- Allow PDF export only for accepted timetables.

### Generating state

- Disable repeated requests.
- Show generation progress.

### Preview state

Show the temporary candidate with only:

- Accept
- Reject

Do not display a Regenerate button.

### After acceptance

- Clear the proposal.
- Refetch the accepted timetable.
- Display the newly accepted result.

### After rejection

- Clear the proposal.
- Continue displaying the old accepted timetable.
- Let the user manually press Generate again if they want another proposal.

## 15. Remove obsolete frontend state

Remove:

- `configId`
- `setConfigId`
- The old `generatedTimetable` state if it is replaced by proposal state
- Configure-related queries and mutations
- The existing Regenerate mutation and button

Add:

- `timetableProposal`
- `proposalToken`
- `generationStatus`
- Non-persisted setters and clearing actions

## 16. Update frontend timetable services

Replace the current service operations with something resembling:

```js
const timetableService = {
  generateProposal: semester =>
    api.post('/timetable/generate', { semester }),

  acceptProposal: data =>
    api.post('/timetable/accept', data),

  getBySemester: semester =>
    api.get('/timetable', { params: { semester } }),
}
```

Keep deletion only if it remains part of the product.

## 17. Strengthen department ownership validation

While making these changes, fix the existing ownership gaps:

- Creating or updating a course must verify that the teacher belongs to the authenticated department.
- AI output IDs must be checked against the authenticated department.
- Acceptance must reject courses or teachers belonging to another department.
- Timetable and booking queries must always include `department`.

## 18. Handle teacher and course deletion safely

Before deleting a teacher:

- Reject deletion if accepted bookings or courses reference the teacher, or
- Require related courses and timetables to be updated first.

Before deleting a course:

- Remove or invalidate bookings and accepted timetables containing that course, or
- Reject deletion until the relevant timetable is replaced.

Silent dangling references should not be allowed.

## 19. Add AI-specific operational protections

Because generation costs money and can take time:

- Add rate limiting to the generation endpoint.
- Prevent multiple simultaneous generation requests from one department.
- Add an AI request timeout.
- Limit repair attempts.
- Validate response size.
- Do not log secrets or unnecessary AI payload data.
- Return understandable errors when the AI cannot produce a valid schedule.

## 20. Database migration

A migration or one-time cleanup will be needed to:

- Remove or ignore existing `ScheduleConfig` documents.
- Convert existing accepted timetables to the new structure.
- Generate `TeacherBooking` documents from existing timetables, or discard existing timetables and generate fresh ones.
- Remove `config` references from timetable records.
- Resolve duplicate department/semester timetables before creating the unique index.
- Resolve existing teacher slot conflicts before creating the booking index.

For a development-stage application, deleting old timetable/configuration data and starting with clean scheduling data may be simpler.

Implemented migration command:

```bash
# Read-only inspection
npm run migrate:timetable

# Delete legacy scheduling data and rebuild the timetable/booking indexes
npm run migrate:timetable -- --apply
```

Run the apply form only after taking a database backup. It requires MongoDB transaction support.

## 21. Testing requirements

Add automated tests for:

- Fixed template construction
- Selection of only relevant teachers
- Exclusion of the current semester’s old bookings
- Cross-semester teacher conflicts
- Consecutive-period validation
- Lunch-boundary validation
- Incorrect AI output
- Missing sessions
- Proposal tampering
- Acceptance transaction success
- Acceptance transaction rollback
- Rejection leaving the old timetable untouched
- Simultaneous acceptance attempts
- One-timetable-per-semester enforcement
- Department ownership isolation

Also test the full user flow:

```text
Generate → Preview → Reject
Generate → Preview → Accept
Generate replacement → Reject and preserve old timetable
Generate replacement → Accept and replace old timetable/bookings
```

## 22. Deployment updates

Finally:

- Configure the AI key and model on the backend hosting service.
- Deploy the backend changes.
- Deploy the frontend changes.
- Ensure MongoDB supports transactions.
- Ensure the previously corrected `/api/auth` mounting and `/api` base URL changes are included.
- Run production checks for registration, login, generation, preview, acceptance, rejection, timetable retrieval, and PDF export.

A sensible implementation order is: fixed template → new models and indexes → validator → AI service → generation preview endpoint → acceptance transaction → frontend preview flow → migration and tests.


## Implementation Status

- [x] Fixed timetable template
- [x] Remove configurable scheduling
- [x] Teacher booking model
- [x] Timetable model changes
- [x] Deterministic validator
- [x] AI scheduling service
- [x] Temporary proposal workflow
- [x] Acceptance transaction
- [x] Frontend preview flow
- [x] Tests and migration
