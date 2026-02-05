# Waste Management Broker Operations OS

A comprehensive operations platform for waste management brokers to manage clients, sites, tickets, invoices, vendors, and service operations.

## Project Structure

```
.
├── backend/          # Node.js/TypeScript API server
├── frontend/         # React/TypeScript web application
├── shared/           # Shared types and utilities
├── Initialscope.md   # Complete feature scope document
└── ImplementationPlan.md  # Phased implementation roadmap
```

## Features Implemented (MVP Phase 1)

### Backend
- ✅ Authentication & Authorization (JWT + RBAC)
- ✅ User management with 6 role types
- ✅ Client management (CRUD operations)
- ✅ Site management (CRUD operations)
- ✅ PostgreSQL database with comprehensive schema
- ✅ RESTful API with Express
- ✅ Multi-tenant architecture
- ✅ Input validation and error handling
- ✅ Audit logging infrastructure

### Frontend
- ✅ Login & Registration pages
- ✅ Dashboard with sidebar navigation
- ✅ Client management UI (list, create, edit, delete)
- ✅ Site management UI (list, create, edit, delete)
- ✅ Protected routes with authentication
- ✅ Responsive design with Tailwind CSS
- ✅ Pagination support
- ✅ Search functionality

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **Authentication**: JWT
- **Validation**: express-validator
- **Security**: bcryptjs, helmet (coming)

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Context API

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Setup Instructions

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb waste_management

# Run the schema initialization
psql waste_management < backend/src/database/schema.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env with your database credentials and JWT secret
# Example:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=waste_management
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Start development server
npm run dev
```

The API server will start on http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env if needed (default points to http://localhost:5000)

# Start development server
npm start
```

The React app will start on http://localhost:3000

## API Documentation

### Base URL
`http://localhost:5000/api/v1`

### Authentication Endpoints

#### Register
```
POST /auth/register
Content-Type: application/json

{
  "orgId": "uuid",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Get Current User
```
GET /auth/me
Authorization: Bearer {access_token}
```

### Client Endpoints

```
GET    /clients              # List clients (paginated)
POST   /clients              # Create client
GET    /clients/:id          # Get client by ID
PUT    /clients/:id          # Update client
DELETE /clients/:id          # Delete client
```

### Site Endpoints

```
GET    /clients/sites        # List sites (paginated)
POST   /clients/sites        # Create site
GET    /clients/sites/:id    # Get site by ID
PUT    /clients/sites/:id    # Update site
DELETE /clients/sites/:id    # Delete site
```

All authenticated requests require the `Authorization` header:
```
Authorization: Bearer {access_token}
```

## User Roles

1. **Admin** - Full system access
2. **Broker Ops Agent** - Ticket management, service operations
3. **Account Manager** - Client relationship management
4. **Billing/Finance** - Invoice and payment management
5. **Vendor Manager** - Vendor relationships and performance
6. **Client User** - Limited client portal access

## Development Workflow

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve the build folder with your preferred static file server
```

## Next Steps (Coming Soon)

Based on the implementation plan, the next features to be built are:

### Sprint 3-4: Ticketing System
- Ticket types and workflows
- Status management
- Vendor assignment
- SLA tracking
- File attachments

### Sprint 5-6: Email Integration
- Email ingestion
- Ticket creation from emails
- Template-based responses
- Threading and classification

### Sprint 7-8: Invoice Management
- Invoice upload and OCR
- Line item extraction
- Approval workflows
- Discrepancy tracking

See `ImplementationPlan.md` for the complete roadmap.

## Database Schema Overview

Key tables:
- `organizations` - Multi-tenant root
- `users` - User accounts with RBAC
- `clients` - Client companies
- `client_sites` - Physical service locations
- `site_services` - Service configurations
- `site_assets` - Containers and equipment
- `tickets` - Service requests and issues
- `invoices` - Vendor invoices
- `vendors` - Hauler and service provider directory
- `documents` - File storage with expiration tracking
- `email_threads` - Email communication tracking
- `audit_logs` - Complete audit trail

## Security Considerations

- All passwords are hashed with bcryptjs
- JWT tokens expire after 7 days
- Row-level security ready (multi-tenant isolation)
- Input validation on all endpoints
- CORS configured for production
- SQL injection protection via parameterized queries

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check connection credentials in backend/.env
- Ensure database exists: `psql -l`

### Frontend Can't Connect to Backend
- Verify backend is running on port 5000
- Check REACT_APP_API_URL in frontend/.env
- Check CORS settings in backend/src/server.ts

### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)
- Clear TypeScript cache: `rm -rf dist`

## Contributing

This is currently a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved
