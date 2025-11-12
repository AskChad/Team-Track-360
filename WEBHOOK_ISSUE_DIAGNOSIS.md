# Webhook Issue Diagnosis - November 12, 2025

## Problem
Files are uploading successfully to storage, but **no competitions, events, or locations are being created** in the database.

## Root Cause Found
The Make.com webhook at `https://hook.us1.make.com/d77nbvtmp1y5fwrjvn4yt7985cthtxo1` is returning:
- **Response**: "Accepted" (plain text)
- **Response Time**: ~357ms
- **Content-Type**: text/plain

This indicates **asynchronous processing mode** is configured, but the webhook is NOT calling back to complete the import.

## Evidence
### Storage (temp-uploads)
- ✅ **10+ files successfully uploaded** (JPG and PDF)
- ❌ Files still present (should be deleted after successful processing)
- Most recent: `1762926597485-SCVWA_Folkstyle_Schedule.jpg` (Nov 12, 2025)

### Database Records
- ❌ **0 competitions** for organization `917fd5d9-ef2d-45bf-b81d-4f48064d495d`
- ❌ **0 events** created
- ⚠️  Only 1 location (from Nov 10, before recent uploads)

## How It Should Work

### Option 1: Synchronous Response (RECOMMENDED)
```
User uploads file → API uploads to storage → Webhook called →
Webhook processes image with OCR → Webhook returns JSON array →
API inserts to database → API deletes file → Success!
```

**Expected webhook response:**
```json
[
  {
    "date": "2025-10-12",
    "name": "Raiders Classic",
    "style": "Folkstyle",
    "divisions": ["8U", "10U", "12U", "14U"],
    "venue_name": "Silver Creek High School",
    "address": "3434 Silver Creek Rd",
    "city": "San Jose",
    "state": "CA",
    "zip": "95121",
    "contact_name": "Roberto Dixon",
    "contact_phone": "831-524-4017",
    "contact_email": "dixwrest@aol.com",
    "registration_weigh_in_time": "7:00 AM"
  }
]
```

### Option 2: Asynchronous Callback (CURRENT - BUT INCOMPLETE)
```
User uploads file → API uploads to storage → Webhook called →
Webhook returns "Accepted" → API waits...
❌ MISSING: Webhook should then call /api/ai-import-callback with results
```

**The async callback endpoint is implemented but Make.com isn't calling it!**

## Solution

You need to configure the Make.com scenario at `https://hook.us1.make.com/d77nbvtmp1y5fwrjvn4yt7985cthtxo1` to do ONE of the following:

### Option A: Return Data Synchronously (EASIEST)
Configure Make.com to:
1. Receive webhook with `fileUrl`
2. Download image from URL
3. Process with OCR (OpenAI Vision, Google Vision, etc.)
4. Parse competition data
5. **Return the JSON array immediately** in the webhook response (not "Accepted")

This will work with the current code without any changes.

### Option B: Implement Async Callback (IF OCR TAKES >30 SECONDS)
Configure Make.com to:
1. Receive webhook with `fileUrl`
2. Return "Accepted" immediately (already doing this)
3. **NEW STEP**: After processing, POST results to:
   - URL: `https://track360.app/api/ai-import-callback`
   - Method: POST
   - Headers: `Content-Type: application/json`
   - Body:
     ```json
     {
       "organizationId": "917fd5d9-ef2d-45bf-b81d-4f48064d495d",
       "entityType": "competitions",
       "filePath": "ai-imports/917fd5d9-ef2d-45bf-b81d-4f48064d495d/1762926597485-SCVWA_Folkstyle_Schedule.jpg",
       "data": [
         {
           "date": "2025-10-12",
           "name": "Raiders Classic",
           ...
         }
       ]
     }
     ```

The callback endpoint is already implemented at `/app/api/ai-import-callback/route.ts`.

## Testing

### Test the webhook:
```bash
node scripts/test-webhook.js
```

### Test the callback endpoint (if using Option B):
```bash
node scripts/test-callback.js  # Need to create this
```

### Check database after testing:
```bash
node scripts/check-competitions.js
```

### Check storage:
```bash
node scripts/check-storage.js
```

## Files Modified
- ✅ `/app/api/ai-import/route.ts` - Already handles both sync and async responses
- ✅ `/app/api/ai-import-callback/route.ts` - Already implemented for async callbacks
- ✅ `/app/admin/page.tsx` - Updated to accept image files only
- ✅ `/app/competitions/page.tsx` - Already configured correctly

## Next Steps
1. **Configure Make.com** to use Option A (synchronous) or Option B (async callback)
2. Test with a new upload
3. Verify database records are created
4. Verify uploaded files are deleted after successful processing
