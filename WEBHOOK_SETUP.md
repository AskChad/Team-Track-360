# Make.com Webhook Setup for AI Import

## Current Webhook URL
`https://hook.us1.make.com/d77nbvtmp1y5fwrjvn4yt7985cthtxo1`

## ⚠️ IMPORTANT: Use Asynchronous Callback (Required)

**Processing Time**: The OCR processing takes ~103 seconds (1.7 minutes), which **exceeds Vercel's 60-second timeout**.

**Solution**: Configure Make.com to use **asynchronous callback** approach.

## Required Configuration

### Step 1: Immediate Response
Configure the Make.com scenario to return "Accepted" immediately when receiving the webhook:

**Response**: `Accepted`
**Response Time**: < 1 second

### Step 2: Asynchronous Processing & Callback
After returning "Accepted", the scenario should:
1. Download the image from `fileUrl`
2. Process with OCR/AI (OpenAI Vision, Google Vision, etc.)
3. Parse the competition data
4. **POST the results** to the callback endpoint: `https://track360.app/api/ai-import-callback`

## Callback Endpoint Details

**URL**: `https://track360.app/api/ai-import-callback`
**Method**: POST
**Headers**: `Content-Type: application/json`

**Required Payload Format**:
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

### Callback Payload Structure

The callback must include these fields from the original webhook request:

```json
{
  "organizationId": "917fd5d9-ef2d-45bf-b81d-4f48064d495d",
  "entityType": "competitions",
  "filePath": "ai-imports/917fd5d9-ef2d-45bf-b81d-4f48064d495d/1762926597485-SCVWA_Folkstyle_Schedule.jpg",
  "data": [
    {
      "event_name": "Raiders Classic",
      "date": "2025-10-12",
      "style": "Folkstyle",
      "divisions": "8U, 10U, 12U, 14U, 16U, JR. Boys, JR. Girls",
      "restrictions": "",
      "registration_weighin_time": "7:00 AM",
      "registration_url": "https://usabracketing.com",
      "venue_name": "Silver Creek High School",
      "street_address": "3434 Silver Creek Rd",
      "city": "San Jose",
      "state": "CA",
      "zip": "95121",
      "contact_name": "Roberto Dixon",
      "contact_phone": "831-524-4017",
      "contact_email": "dixwrest@aol.com"
    }
  ]
}
```

**Critical Fields**:
- `organizationId`: From original webhook request
- `entityType`: From original webhook request (always "competitions")
- `filePath`: From original webhook request (for file cleanup)
- `data`: Array of extracted competition data

**Note**: The `filePath` is essential - it allows the system to automatically delete the uploaded file from storage after successful processing.

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
