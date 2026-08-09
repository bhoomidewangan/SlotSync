# SlotSync

SlotSync is a full-stack timetable scheduling application for academic departments. Departments manage teachers and semester courses, generate timetable proposals with the Gemini Developer API, preview proposals before saving them, and accept a validated timetable without overwriting the currently active timetable prematurely.

## Features

- Department registration and login with JWT authentication
- Teacher and course management scoped to the authenticated department
- Fixed Monday-Friday timetable with ten teaching periods and a lunch break
- Gemini-powered timetable proposal generation
- Strict backend validation of every generated proposal
- Preview, accept, and reject workflow
- One accepted timetable per department and semester
- Cross-semester teacher-conflict protection through `TeacherBooking` records
- Transactional timetable acceptance, replacement, and deletion
- PDF export for accepted timetables
- Generation rate limiting, duplicate-request protection, retries, and timeouts
- Signed proposal tokens with a two-hour acceptance window

## Technology

### Frontend

- React 18 and Vite
- React Router
- TanStack Query
- Zustand
- Tailwind CSS
- Axios
- jsPDF and html2canvas

### Backend

- Node.js and Express
- MongoDB with Mongoose
- Zod validation
- JSON Web Tokens
- Gemini Developer API

## Timetable design

SlotSync uses one fixed timetable template:

- Monday through Friday
- `P1` through `P5`
- Lunch from 12:10 to 12:40
- `P6` through `P10`
- Stable slot IDs such as `MON_P1`, `TUE_P7`, and `FRI_P10`

The template is not configurable from the user interface.

## Generation workflow

```text
Generate -> Temporary preview -> Accept or Reject
```

1. The backend loads courses for the selected semester.
2. It loads bookings only for teachers involved in those courses.
3. Gemini returns a JSON timetable proposal.
4. The backend validates all IDs, session counts, consecutive periods, lunch boundaries, blocked slots, and conflicts.
5. The frontend displays the proposal without changing MongoDB.
6. Accepting revalidates the proposal against current database state and saves it in a transaction.
7. Rejecting clears only the temporary proposal.

Proposals exist only in frontend memory. Refreshing or closing the page discards the preview. Proposal tokens are valid for up to two hours by default.

## Requirements

- Node.js 18 or newer
- npm
- MongoDB Atlas or a MongoDB replica set with transaction support
- A Gemini Developer API key from Google AI Studio

MongoDB transactions are required for safely accepting, replacing, and deleting timetables and teacher bookings.

## Installation

From the repository root:

```powershell
npm.cmd run install:all
```

Alternatively, install each application separately:

```powershell
npm.cmd install
Set-Location -LiteralPath "Client"
npm.cmd install
Set-Location -LiteralPath "..\Server"
npm.cmd install
```

## Environment configuration

Create `Server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster/database

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

GEMINI_API_KEY=replace_with_your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash

AI_REQUEST_TIMEOUT_MS=90000
AI_REPAIR_ATTEMPTS=1
AI_TRANSIENT_RETRIES=2
AI_RETRY_BASE_DELAY_MS=1000
AI_MAX_RESPONSE_BYTES=1000000
AI_GENERATION_WINDOW_MS=60000
AI_GENERATION_MAX_REQUESTS=5

PROPOSAL_TOKEN_SECRET=replace_with_a_different_long_random_secret
PROPOSAL_TOKEN_TTL=2h
PROPOSAL_TOKEN_MAX_AGE=2h
```

Create `Client/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_API_TIMEOUT_MS=180000
```

Generate strong secrets with Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run the command twice and use different values for `JWT_SECRET` and `PROPOSAL_TOKEN_SECRET`. Never commit `.env` files or expose the Gemini API key in frontend code.

The selected Gemini model must show available RPD quota in Google AI Studio. A `429` response means the model's request or token quota has been exhausted. A `503` response normally means temporary provider demand.

## Running locally

Open two PowerShell terminals.

Backend:

```powershell
Set-Location -LiteralPath "E:\Web Projects\SlotSync\Server"
npm.cmd run dev
```

Frontend:

```powershell
Set-Location -LiteralPath "E:\Web Projects\SlotSync\Client"
npm.cmd run dev
```

Local addresses:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

The Vite development server is configured for port `3000`, not `5173`.

## Using the application

1. Register a department account or log in.
2. Add teachers.
3. Add courses and assign each course to a teacher.
4. Select a semester on the timetable page.
5. Generate a timetable proposal.
6. Review the temporary preview.
7. Accept it within two hours or reject it.
8. Export the accepted timetable as a PDF when needed.

Avoid repeatedly pressing Generate. Gemini free-tier limits count provider requests, including repair and retry attempts.

## API routes

All routes are prefixed with `/api`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Register a department |
| `POST` | `/auth/login` | Log in |
| `GET` | `/auth/me` | Load the authenticated department |
| `GET` | `/teachers` | List teachers |
| `POST` | `/teachers` | Create a teacher |
| `PUT` | `/teachers/:id` | Update a teacher |
| `DELETE` | `/teachers/:id` | Delete a teacher when safe |
| `GET` | `/courses` | List courses, optionally filtered by semester |
| `POST` | `/courses` | Create a course |
| `PUT` | `/courses/:id` | Update a course |
| `DELETE` | `/courses/:id` | Delete a course when safe |
| `POST` | `/timetable/generate` | Generate a temporary proposal |
| `POST` | `/timetable/accept` | Validate and accept a proposal |
| `GET` | `/timetable?semester=3` | Get the accepted timetable for a semester |
| `GET` | `/timetable/:id` | Get an accepted timetable by ID |
| `DELETE` | `/timetable/:id` | Delete a timetable and its bookings transactionally |

Teacher, course, and timetable routes require authentication.

## Validation and safety

Gemini does not decide whether its own output is valid. The backend independently verifies:

- Department and semester ownership
- Course and assigned-teacher IDs
- Monday-Friday days and `P1`-`P10` periods
- Stable slot IDs and matching day-period combinations
- Exact sessions per week
- Consecutive multi-period sessions
- Lunch-boundary rules
- Semester slot conflicts
- Teacher conflicts and blocked slots
- Duplicate and unknown values

Acceptance performs the validation again using the latest database state. Database writes occur in one MongoDB transaction, so a failure preserves the existing timetable and bookings.

## Tests and build

Backend tests:

```powershell
Set-Location -LiteralPath "Server"
npm.cmd test
```

Frontend tests:

```powershell
Set-Location -LiteralPath "Client"
npm.cmd test
```

Frontend production build:

```powershell
Set-Location -LiteralPath "Client"
npm.cmd run build
```

## Database migration

The migration command inspects legacy configuration and timetable data by default:

```powershell
Set-Location -LiteralPath "Server"
npm.cmd run migrate:timetable
```

After taking a database backup, development databases can be cleaned and indexes rebuilt with:

```powershell
npm.cmd run migrate:timetable -- --apply
```

The apply operation deletes legacy scheduling data and requires MongoDB transaction support. Do not run it against important data without a verified backup.

## Project structure

```text
SlotSync/
|-- Client/                 React frontend
|   |-- src/components/
|   |-- src/pages/
|   |-- src/services/
|   |-- src/store/
|   `-- test/
|-- Server/                 Express backend
|   |-- scripts/            Database migration command
|   |-- src/constants/      Fixed timetable template
|   |-- src/controllers/
|   |-- src/models/
|   |-- src/routes/
|   |-- src/services/       AI, proposal, acceptance, and migration services
|   |-- src/validators/
|   `-- test/
`-- docs/
    `-- timetable-redesign.md
```

The retired CSP scheduler and configurable timetable system have been removed. Gemini generates candidate proposals, while deterministic backend validation remains the final authority.

## Additional design documentation

See [`docs/timetable-redesign.md`](docs/timetable-redesign.md) for the redesign decisions, data model, security rules, migration plan, and implementation status.
