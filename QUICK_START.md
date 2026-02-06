# Vendor Invoice System - Quick Start Guide

## 1. Install Frontend Dependencies

```bash
cd frontend
npm install react-dropzone react-pdf
```

## 2. Configure Supabase

### Get Credentials
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings > API
4. Copy:
   - `URL` (e.g., https://xxxxx.supabase.co)
   - `service_role` key (the long secret key)

### Create Storage Bucket
1. In Supabase Dashboard → Storage
2. Click "Create Bucket"
3. Name: `vendor-invoices`
4. **Important**: Set to PRIVATE (not public)
5. Click "Create Bucket"

## 3. Update Backend .env

Add these lines to `backend/.env`:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
SUPABASE_STORAGE_BUCKET=vendor-invoices
MAX_FILE_SIZE=10485760
```

## 4. Start the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## 5. Test the System

1. Login to the application
2. Navigate to "Vendor Invoices" in sidebar
3. Click "+ Upload Invoice"
4. Select a vendor
5. Drag a PDF file or click to browse
6. Click "Upload & Process"
7. Wait for OCR processing (5-15 seconds)
8. Click "View" to see the PDF and edit data

## What's New?

### Two Invoice Types
- **Vendor Invoices** (`/vendor-invoices`) - NEW
  - Invoices FROM vendors TO your organization
  - Upload PDFs with OCR extraction

- **Client Billing** (`/client-billing`) - RENAMED
  - Invoices FROM your organization TO clients
  - Previously called "Invoices"

### Features
- Drag-and-drop PDF upload
- Automatic OCR data extraction
- Confidence scoring (70%+ = good)
- Split-screen PDF viewer with editable form
- Secure file storage with Supabase

### Access Control
- **Upload/Edit**: admin, billing_finance, vendor_manager
- **View**: All authenticated users

## Troubleshooting

**Error: "Storage not configured"**
→ Add SUPABASE_URL and SUPABASE_SERVICE_KEY to backend/.env

**PDF not loading**
→ Verify Supabase bucket exists and is PRIVATE

**Upload fails**
→ Check file is PDF and under 10MB

**OCR accuracy low**
→ Normal for image-based PDFs. Edit data manually.

## Need Help?

See detailed documentation:
- `IMPLEMENTATION_COMPLETE.md` - Full implementation details
- `VENDOR_INVOICE_SETUP.md` - Complete setup guide

---

**Quick Reference**

| Component | Location |
|-----------|----------|
| Upload Modal | Click "+ Upload Invoice" button |
| View/Edit Modal | Click "View" on any invoice |
| PDF Viewer | Left side of view modal |
| Edit Form | Right side of view modal |
| OCR Confidence | Green/Yellow/Red dot in list |
| Navigation | Sidebar: "Vendor Invoices" or "Client Billing" |
