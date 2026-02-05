# Quick Start Guide

Get the Waste Management Broker OS running in under 5 minutes!

## Option 1: Docker (Recommended - Easiest)

### Prerequisites
- Docker and Docker Compose installed

### Steps
```bash
# 1. Start all services (database, backend, frontend)
docker-compose up

# Wait for all services to be ready (about 30-60 seconds)
# The database schema will be automatically initialized

# 2. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Database: localhost:5432
```

That's it! The entire stack is now running.

### Stopping the services
```bash
# Stop all services
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

## Option 2: Manual Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### Steps

#### 1. Database Setup
```bash
# Create database
createdb waste_management

# Initialize schema
psql waste_management < backend/src/database/schema.sql
```

#### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

Backend runs on http://localhost:5000

#### 3. Frontend Setup (in a new terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

Frontend runs on http://localhost:3000

## First Steps

### 1. Create an Organization
First, you need an organization ID. In PostgreSQL:

```sql
-- Connect to database
psql waste_management

-- Create an organization
INSERT INTO organizations (name, slug, email)
VALUES ('Demo Company', 'demo-company', 'admin@democompany.com')
RETURNING id;

-- Copy the returned UUID - you'll need this for registration
```

### 2. Register Your First User

Go to http://localhost:3000/register and create an account using:
- Organization ID: (the UUID from step 1)
- Your email and password
- Your name and optional phone

### 3. Start Using the System

Once logged in, you can:
- Add clients from the Clients page
- Add sites for each client
- View the dashboard for overview
- (More features coming in future sprints)

## Test Account (After Manual DB Setup)

If you want to skip registration, you can create a test account directly:

```sql
-- In PostgreSQL
INSERT INTO users (
  org_id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  email_verified
) VALUES (
  'YOUR_ORG_ID_HERE',
  'admin@test.com',
  '$2a$10$rI7J7KRLJz9pJKp7vJ5yPeN6xR1mQ1dJ0mE8vW6tD5.xP7jF1wR2a', -- password: Admin123!
  'Admin',
  'User',
  'admin',
  true
);
```

Login with:
- Email: admin@test.com
- Password: Admin123!

## Troubleshooting

### Port already in use
If ports 3000, 5000, or 5432 are already in use:

**Docker:**
Edit docker-compose.yml and change the port mappings

**Manual:**
Change PORT in backend/.env and REACT_APP_API_URL in frontend/.env

### Database connection failed
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in backend/.env
- Check database exists: `psql -l | grep waste_management`

### Frontend shows blank page
- Check browser console for errors
- Verify backend is running and accessible
- Check REACT_APP_API_URL in frontend/.env

## Next Steps

- Read [README.md](./README.md) for full documentation
- See [ImplementationPlan.md](./ImplementationPlan.md) for roadmap
- Check [Initialscope.md](./Initialscope.md) for complete feature list

## Need Help?

Check the main README.md for detailed troubleshooting or contact the development team.
