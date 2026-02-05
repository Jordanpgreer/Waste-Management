# Supabase Setup Guide

## Step 1: Get Your Connection Details

After creating your Supabase project:

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon in sidebar)
3. Click **Database**
4. Scroll to **Connection string**
5. Select **URI** tab
6. Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)

## Step 2: Update Your .env File

Parse the connection string into these variables:

```
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-actual-password-here
```

## Step 3: Run the Database Schema

I'll help you run this via Supabase SQL Editor:

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the contents of `backend/src/database/schema.sql`
4. Paste into the query editor
5. Click **Run** (or press Ctrl/Cmd + Enter)

## Step 4: Verify Setup

Run the backend server - it should connect successfully!

## Important Notes

- **Connection pooling**: Supabase includes pgBouncer (connection pooler)
- **Use transaction mode**: Change DB_PORT to 6543 for pooled connections in production
- **Direct connection** (port 5432): Use for migrations and schema changes
- **Pooled connection** (port 6543): Use for application queries in production

## Security Best Practices

1. Never commit `.env` file to git
2. Use `.env.example` as template
3. Rotate DB password if exposed
4. Enable Row Level Security (RLS) for production
5. Use connection pooling in production
