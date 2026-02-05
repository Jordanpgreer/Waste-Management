# Test User Credentials

**IMPORTANT:** These are test credentials for development only. Never commit this file to git!

---

## Organization
- **Name:** Demo Waste Management Co
- **Slug:** demo-waste-mgmt
- **Organization ID:** `2c2374d0-ed54-4de7-859f-365f0e191b7d`

---

## Admin User (YOU)
- **Email:** `admin@demowaste.com`
- **Password:** `Admin123!@#`
- **Role:** `admin`
- **Permissions:** Full system access

---

## Test Regular User
- **Email:** `test@demowaste.com`
- **Password:** `Test123!@#`
- **Role:** `client_user`
- **Permissions:** Limited client access

---

## Additional Test Users (Different Roles)

### Broker Operations Agent
- **Email:** `broker@demowaste.com`
- **Password:** `Test123!@#`
- **Role:** `broker_ops_agent`

### Account Manager
- **Email:** `account@demowaste.com`
- **Password:** `Test123!@#`
- **Role:** `account_manager`

### Billing/Finance
- **Email:** `billing@demowaste.com`
- **Password:** `Test123!@#`
- **Role:** `billing_finance`

---

## How to Login

### Via Frontend (Recommended)
1. Go to: http://localhost:3000
2. Enter email and password
3. Click login

### Via API (cURL)
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demowaste.com",
    "password": "Admin123!@#"
  }'
```

### Via API (JavaScript/Fetch)
```javascript
const response = await fetch('http://localhost:5000/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@demowaste.com',
    password: 'Admin123!@#'
  })
});

const data = await response.json();
console.log(data); // Contains accessToken and refreshToken
```

---

## User Roles & Permissions

Your system supports 6 different user roles:

1. **admin** - Full system access
2. **broker_ops_agent** - Handles operations and ticket management
3. **account_manager** - Manages client accounts and relationships
4. **billing_finance** - Handles invoicing and financial operations
5. **vendor_manager** - Manages vendor relationships (not created yet)
6. **client_user** - Limited access for client portal users

---

## Next Steps

1. ✅ Login to http://localhost:3000 with admin credentials
2. Test the different user roles
3. Create clients, sites, and tickets
4. Test the full workflow

---

**Remember:** All users are email verified and active by default for testing.
