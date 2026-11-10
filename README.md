# Sweety – Blood Glucose Tracker

A full-stack blood glucose tracking application that allows users to securely record, manage, and review their daily blood glucose readings.

## Features

### Authentication
- User registration and login
- Password hashing using bcrypt
- JWT-based authentication
- User-specific data access

### Blood Glucose Readings
- Add, view, update, and delete readings
- Four daily slots: Morning, After breakfast, After lunch, After dinner
- Whole-number values between 40 and 600 mg/dl
- One reading per slot per day
- Maximum four readings per day
- Future dates are not allowed

### Reports
- Daily report
- Month-to-date report
- Previous full month report
- Highest, lowest, average and reading count
- Average rounded to one decimal place

## Technology Stack

- Frontend: React, Vite, Axios, Lucide React, CSS
- Backend: Node.js, Express.js
- Database: PostgreSQL (Neon)
- Authentication: bcrypt and JWT
- Testing: Jest and Supertest

## Project Structure

- `client/` – React frontend
- `server/` – Express backend
- `server/src/config/schema.sql` – Database schema
- `server/src/config/seed.js` – Demo data
- `server/tests/` – Backend tests
- `.gitignore` – Excludes secrets and dependencies
Setup Instructions
Prerequisites
- Node.js and npm
- Git
- A PostgreSQL database (Neon is used for this project)
1. Clone the repository
git clone https://github.com/tarunkalikiri/sweety-blood-glucose-tracker.git
cd sweety-blood-glucose-tracker


2. Configure the database
- Create a PostgreSQL database using Neon or another PostgreSQL provider.
- Execute server/src/config/schema.sql in your database SQL editor.
- Copy your database connection string.
3. Configure the backend
cd server
npm install


Create server/.env using server/.env.example as a reference.

Configure the following variables:
PORT=5000
NODE_ENV=development
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173


4. Seed demo data
npm run seed


Demo credentials:
- Email: demo@sweety.com
- Password: Sweety@123
The seed script creates four sample readings dated one day before the database's current date.

5. Start the backend
npm run dev


Backend: http://localhost:5000

Health check: http://localhost:5000/api/health

6. Configure and start the frontend

Open a second terminal:
cd client
npm install


Create client/.env using client/.env.example as a reference.
VITE_API_URL=http://localhost:5000/api


Start the frontend:
npm run dev


Frontend: http://localhost:5173

## API Endpoints

All reading and report endpoints require a valid JWT bearer token.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in |

### Blood Glucose Readings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/readings` | Create a reading |
| GET | `/api/readings` | Get the authenticated user's readings |
| PUT | `/api/readings/:id` | Update a reading |
| DELETE | `/api/readings/:id` | Delete a reading |

### Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily report |
| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | Month-to-date report |
| GET | `/api/reports/previous-month?date=YYYY-MM-DD` | Previous full month report |

## Validation and Data Integrity

- Passwords are hashed using bcrypt before storage.
- Reading values must be whole numbers between 40 and 600 mg/dl.
- Reading dates must be valid and cannot be in the future.
- Only the four supported time slots are accepted.
- A database unique constraint prevents duplicate readings for the same user, date, and time slot.
- Database foreign keys associate readings with their users.
- Reading operations are restricted to the authenticated user.
- A maximum of four readings is allowed per day.

## Running Tests

From the `server` directory:

```bash
npm test
```

The automated test suite covers API health, authentication requirements, reading value validation, invalid time slots, and invalid or future report dates.

## Assumptions and Notes

- All glucose readings are stored as integer mg/dl values.
- A user can record one reading in each of the four predefined daily time slots.
- The four supported slots and unique user/date/slot constraint enforce the maximum of four readings per day.
- The month-to-date report includes the first day of the selected month through the selected date.
- The previous-month report covers the entire calendar month immediately before the selected date's month.
- Reports with no readings return a count of zero and null summary values.
- The demo seed script creates sample readings for the previous database calendar day.

## Security Notes

- Never commit `.env` files or database credentials.
- Use a strong, private JWT secret.
- Passwords are hashed before storage.
- Reading and report endpoints require authentication.
- Users can access only their own data.

## Screenshots / Demo

Screenshots or a short demonstration recording will be added before submission.

## Author

**Tarun Kalikiri**
