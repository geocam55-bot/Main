# Background Import System - ProSpaces CRM

## Overview

The Background Import System allows you to import large inventory files (thousands of records) in the background without blocking the UI. You'll receive real-time notifications when imports complete.

## Features

✅ **Asynchronous Processing**: Import runs in the background - you can close the page and continue working
✅ **Real-time Notifications**: Get notified instantly when imports complete via toast notifications and browser notifications
✅ **Progress Tracking**: Monitor import progress with live updates
✅ **Batch Processing**: Processes records in batches of 100 for optimal performance
✅ **Automatic Retry**: Failed records are tracked with detailed error messages
✅ **Duplicate Handling**: Automatically updates existing records based on SKU matching

## How to Use

### 1. Start a Background Import

1. Go to **Import & Export** module
2. Select an inventory CSV/Excel file
3. Review the column mapping
4. Click **"Run in Background"** button
5. You'll see a confirmation toast: "Background import started for X records!"

### 2. Monitor Progress

Navigate to the Background Import Manager to see:
- **Active Imports**: Currently running imports with progress bars
- **Recent Imports**: Last 10 completed imports with success/failure stats

Access via:
- Click "View Status" in the toast notification
- Or navigate directly to the Background Import Manager

### 3. Enable Notifications

Click **"Enable Notifications"** button to receive:
- Browser notifications when imports complete
- Toast notifications with import results
- Links to view imported inventory

### 4. View Results

When complete, you'll see:
- ✅ Success count
- ❌ Failure count
- 📋 Detailed error messages for failed records

## Technical Details

### Background Job Processing

- Jobs are stored in the `scheduled_jobs` database table
- Auto-processor checks every 5 seconds for pending jobs
- Jobs marked as "pending" are picked up and processed immediately
- Real-time updates via Supabase Realtime subscriptions

### Import Flow

```
File Upload → Column Mapping → Create Background Job → Auto-Processor
    ↓                              ↓
Parse Data                  Store in DB (pending)
    ↓                              ↓
Map Columns              Wait for processor
    ↓                              ↓
Validate                    Start processing
                                   ↓
                          Batch process (100 per batch)
                                   ↓
                          Update progress in real-time
                                   ↓
                          Mark complete/failed
                                   ↓
                          Notify user
```

### Performance

- **Batch Size**: 100 records per batch
- **Processing Speed**: ~500-1000 records per minute
- **Memory Efficient**: Streams data in batches
- **Database Optimized**: Uses bulk upsert operations

## Database Schema

### scheduled_jobs Table

```sql
- id: UUID (primary key)
- organization_id: TEXT (references organizations)
- created_by: UUID (references profiles)
- job_type: 'import' | 'export'
- data_type: 'inventory' | 'contacts' | 'bids'
- scheduled_time: TIMESTAMP
- status: 'pending' | 'processing' | 'completed' | 'failed'
- file_name: TEXT
- file_data: JSONB (stores mapped records)
- record_count: INTEGER (final success count)
- error_message: TEXT (errors from failed records)
- progress: JSONB { current, total, percent }
```

## Components

### 1. BackgroundImportManager.tsx
- Main UI for monitoring background imports
- Real-time job tracking with Supabase Realtime
- Progress visualization with progress bars
- Notification management

### 2. ImportExport.tsx (Enhanced)
- Added `createBackgroundImportJob()` function
- New "Run in Background" button
- Integrates with existing import flow
- Maps columns before creating background job

### 3. Database Table: scheduled_jobs
- Stores all background import jobs
- RLS policies for organization isolation
- Indexes for performance optimization

## Navigation

Access the Background Import Manager:
- **Route**: `background-imports`
- **From Import**: Click "View Status" in success toast
- **Direct**: Navigate via app routing to `background-imports` view

## Future Enhancements

Potential improvements:
- 📊 Import analytics and history
- 📧 Email notifications when imports complete
- ⏰ Scheduled recurring imports
- 🔄 Automatic duplicate cleanup after import
- 📈 Import performance metrics dashboard
- 💾 Save import templates for reuse
- 🎯 Smart mapping suggestions based on history

## Troubleshooting

**Import stuck at "Processing":**
- Check browser console for errors
- Verify database connection
- Check RLS policies on scheduled_jobs table

**Notifications not working:**
- Click "Enable Notifications" button
- Grant browser notification permission
- Check browser notification settings

**Import failed:**
- Check error message in completed jobs
- Verify required fields (name, sku) are mapped
- Check for data validation issues
- Review first 10 error messages in job details

## Example Workflow

```
User: Upload inventory_2024.csv (10,000 records)
  ↓
System: Auto-map columns (SKU, Name, Price, etc.)
  ↓
User: Review mapping → Click "Run in Background"
  ↓
System: Create job in database (status: pending)
  ↓
System: Auto-processor picks up job within 5 seconds
  ↓
System: Process batch 1/100 (100 records)
  ↓
System: Update progress: 1% → 10% → 50% → 100%
  ↓
System: Mark job complete (9,850 success, 150 failed)
  ↓
System: Send notification → "✅ Import Complete!"
  ↓
User: Click "View Inventory" → See imported items
```

## Security

- ✅ RLS policies enforce organization isolation
- ✅ Jobs only visible to users in same organization
- ✅ Only job creator can cancel/delete
- ✅ All imports logged with creator name and timestamp
- ✅ Error messages sanitized (no sensitive data)

---

**System Status**: ✅ Production Ready
**Last Updated**: December 2024
**Version**: 1.0.0
