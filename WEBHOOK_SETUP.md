# Make.com Webhook Setup for AI Import

## Current Webhook URL
`https://hook.us1.make.com/d77nbvtmp1y5fwrjvn4yt7985cthtxo1`

## Problem
The webhook currently returns "Accepted" but doesn't process the image and return data synchronously.

## Solution Options

### Option 1: Synchronous Response (Recommended for immediate feedback)

Configure the Make.com scenario to:
1. Receive the webhook payload with `fileUrl`
2. Download the image from the `fileUrl`
3. Process with OCR/AI (OpenAI Vision, Google Vision, etc.)
4. Parse the competition data
5. **Return the structured JSON immediately** in the webhook response

Expected response format:
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

### Option 2: Asynchronous Callback

If OCR processing takes too long (>30 seconds), configure Make.com to:

1. Receive webhook payload
2. Return "Accepted" immediately
3. Process image asynchronously
4. When done, POST the results to: `https://track360.app/api/ai-import-callback`

Callback payload format:
```json
{
  "organizationId": "917fd5d9-ef2d-45bf-b81d-4f48064d495d",
  "entityType": "competitions",
  "filePath": "ai-imports/917fd5d9-ef2d-45bf-b81d-4f48064d495d/1234567890-schedule.jpg",
  "data": [
    {
      "date": "2025-10-12",
      "name": "Raiders Classic",
      ...
    }
  ]
}
```

**Note:** Include the `filePath` parameter (the path in storage) so the uploaded file can be automatically deleted after processing.

## Current Behavior

When the webhook returns just "Accepted", the API accepts it but cannot create database records because there's no data to insert.

## Testing

Test the webhook with:
```bash
node scripts/test-pdf-upload.js
```

This should either:
- Return JSON array immediately (Option 1)
- Return "Accepted" and then call back with data (Option 2)
