# SlotSync — Automated Institute Timetable Scheduler

A full-stack web app where institute departments can register, log in, and automatically generate conflict-free weekly timetables from their courses and teachers.

---

## Features

- **Department Auth** — each department registers and logs in with JWT-based authentication. All data is completely isolated between departments.
- **Teacher Management** — add teachers and the subjects they teach.
- **Course Management** — add courses per semester, assign teachers, set sessions per week and periods per session.
- **Schedule Configuration** — set working days, start time, period duration, and lunch break.
- **Automatic Timetable Generation** — CSP backtracking algorithm with MRV heuristic generates a valid, conflict-free timetable in seconds.
- **PDF Export** — download the timetable as a color-coded A4 landscape PDF.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, React Hook Form, Zod |
| Backend | Node.js, Express.js, MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| Algorithm | CSP Backtracking with MRV Heuristic |
| PDF Export | jsPDF, html2canvas |

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/slotsync.git
cd slotsync

# Install all dependencies
npm run install:all
```

### Environment Variables

**`server/.env`**
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

**`client/.env`**
```
VITE_API_URL=http://localhost:5000/api
```

### Run

```bash
# Start both client and server together
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

---

## Usage

1. Register your department at `/register`
2. Add teachers with their subjects
3. Add courses for a semester and assign teachers
4. Go to Configure — set working days, time slots, and lunch break
5. Click **Generate Timetable**
6. View the timetable and click **Download PDF**

---

## Project Structure

```
slotsync/
├── client/          # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── store/
│       └── utils/
└── server/          # Express backend
    └── src/
        ├── algorithm/   # CSP solver
        ├── controllers/
        ├── middleware/
        ├── models/
        └── routes/
```

---

## Algorithm

The timetable is generated using a **Constraint Satisfaction Problem (CSP)** solver with backtracking:

- Each course session is a variable that needs to be assigned a (day, time slot) value
- Sessions are sorted hardest-first using the **MRV (Minimum Remaining Values)** heuristic
- Hard constraints checked on every placement:
  - No teacher double-booked at the same time
  - No session placed over the lunch break
  - Same course not scheduled twice on the same day
- Backtracks automatically when no valid placement is found

---

## License

MIT
