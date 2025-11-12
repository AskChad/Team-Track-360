# Organization Credentials System

Universal system for managing encrypted third-party API keys and credentials for organizations.

## Quick Start

### 1. Get a Single Credential

```typescript
import { getOrganizationCredential, CredentialType } from '@/lib/credentials';
import OpenAI from 'openai';

// Get OpenAI API key
const apiKey = await getOrganizationCredential(organizationId, CredentialType.OPENAI_API_KEY);

if (!apiKey) {
  return { error: 'OpenAI key not configured' };
}

const openai = new OpenAI({ apiKey });
```

### 2. Get Multiple Credentials at Once

```typescript
import { getOrganizationCredentials, CredentialType } from '@/lib/credentials';

const credentials = await getOrganizationCredentials(organizationId, [
  CredentialType.OPENAI_API_KEY,
  CredentialType.STRIPE_SECRET_KEY,
  CredentialType.SENDGRID_API_KEY
]);

// Use the credentials
if (credentials[CredentialType.OPENAI_API_KEY]) {
  const openai = new OpenAI({
    apiKey: credentials[CredentialType.OPENAI_API_KEY]
  });
}
```

### 3. Check if Credential Exists

```typescript
import { hasOrganizationCredential, CredentialType } from '@/lib/credentials';

if (await hasOrganizationCredential(organizationId, CredentialType.STRIPE_SECRET_KEY)) {
  // Organization has Stripe configured
  // Show Stripe features in UI
}
```

### 4. Check Multiple Credentials

```typescript
import { checkOrganizationCredentials, CredentialType } from '@/lib/credentials';

const configured = await checkOrganizationCredentials(organizationId, [
  CredentialType.OPENAI_API_KEY,
  CredentialType.STRIPE_SECRET_KEY,
  CredentialType.GOOGLE_CLIENT_ID
]);

// Returns:
// {
//   'openai_api_key_encrypted': true,
//   'stripe_secret_key_encrypted': false,
//   'google_client_id_encrypted': true
// }
```

## Available Credential Types

Currently supported integrations:

- `OPENAI_API_KEY` - OpenAI API key for AI features
- `STRIPE_SECRET_KEY` - Stripe secret key for payments
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `ZOOM_CLIENT_ID` - Zoom API client ID
- `ZOOM_CLIENT_SECRET` - Zoom API client secret
- `TWILIO_ACCOUNT_SID` - Twilio account SID for SMS
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `SENDGRID_API_KEY` - SendGrid for email
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications

## Adding a New Integration

### Step 1: Add to Database Schema

Add new encrypted column to `parent_organizations` table:

```sql
ALTER TABLE parent_organizations
  ADD COLUMN your_service_api_key_encrypted text,
  ADD COLUMN your_service_api_key_updated_at timestamptz;
```

**Naming convention**: `{service}_{key_type}_encrypted`

### Step 2: Add to CredentialType Enum

Edit `/lib/credentials.ts`:

```typescript
export const CredentialType = {
  // ... existing types ...
  YOUR_SERVICE_API_KEY: 'your_service_api_key_encrypted',
} as const;
```

### Step 3: Create Management API Route (Optional)

Create `/app/api/organizations/[id]/your-service-key/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth } from '@/lib/auth';
import { encrypt } from '@/lib/encryption';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = requireAuth(req.headers.get('authorization'));
  const { api_key } = await req.json();

  // Validate permissions...

  // Encrypt and save
  const encryptedKey = encrypt(api_key);
  await supabaseAdmin
    .from('parent_organizations')
    .update({
      your_service_api_key_encrypted: encryptedKey,
      your_service_api_key_updated_at: new Date().toISOString()
    })
    .eq('id', params.id);

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = requireAuth(req.headers.get('authorization'));

  // Check if key exists (don't return actual key)
  const { data: org } = await supabaseAdmin
    .from('parent_organizations')
    .select('your_service_api_key_encrypted, your_service_api_key_updated_at')
    .eq('id', params.id)
    .single();

  return NextResponse.json({
    success: true,
    data: {
      has_key: !!org?.your_service_api_key_encrypted,
      updated_at: org?.your_service_api_key_updated_at
    }
  });
}
```

### Step 4: Use It!

```typescript
import { getOrganizationCredential, CredentialType } from '@/lib/credentials';
import YourServiceSDK from 'your-service-sdk';

const apiKey = await getOrganizationCredential(orgId, CredentialType.YOUR_SERVICE_API_KEY);

if (!apiKey) {
  return { error: 'Your Service not configured' };
}

const client = new YourServiceSDK({ apiKey });
// Use the client...
```

## Real-World Examples

### Example 1: OpenAI Integration

```typescript
import { getOrganizationCredential, CredentialType } from '@/lib/credentials';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  const { organizationId, prompt } = await req.json();

  const apiKey = await getOrganizationCredential(organizationId, CredentialType.OPENAI_API_KEY);

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI not configured for this organization' },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });

  return NextResponse.json({ result: completion.choices[0].message.content });
}
```

### Example 2: Stripe Payments

```typescript
import { getOrganizationCredential, CredentialType } from '@/lib/credentials';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const { organizationId, amount } = await req.json();

  const secretKey = await getOrganizationCredential(organizationId, CredentialType.STRIPE_SECRET_KEY);

  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 400 }
    );
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
```

### Example 3: Multiple Services

```typescript
import { getOrganizationCredentials, CredentialType } from '@/lib/credentials';
import OpenAI from 'openai';
import { Twilio } from 'twilio';

export async function POST(req: NextRequest) {
  const { organizationId, phoneNumber, prompt } = await req.json();

  // Get both credentials at once
  const credentials = await getOrganizationCredentials(organizationId, [
    CredentialType.OPENAI_API_KEY,
    CredentialType.TWILIO_ACCOUNT_SID,
    CredentialType.TWILIO_AUTH_TOKEN
  ]);

  // Generate AI response
  if (credentials[CredentialType.OPENAI_API_KEY]) {
    const openai = new OpenAI({
      apiKey: credentials[CredentialType.OPENAI_API_KEY]
    });
    const completion = await openai.chat.completions.create({ /* ... */ });
    const aiResponse = completion.choices[0].message.content;

    // Send via SMS
    if (credentials[CredentialType.TWILIO_ACCOUNT_SID] &&
        credentials[CredentialType.TWILIO_AUTH_TOKEN]) {
      const twilio = new Twilio(
        credentials[CredentialType.TWILIO_ACCOUNT_SID],
        credentials[CredentialType.TWILIO_AUTH_TOKEN]
      );

      await twilio.messages.create({
        body: aiResponse,
        to: phoneNumber,
        from: '+1234567890'
      });
    }
  }

  return NextResponse.json({ success: true });
}
```

## Security Notes

- All credentials are **automatically encrypted** at rest using AES-256
- Keys are **never returned** in GET requests (only existence check)
- Only org admins and platform admins can manage credentials
- Decryption happens **only when needed** in server-side code
- Never expose decrypted credentials to the client

## Benefits

✅ **Consistent**: Same pattern for all integrations
✅ **Secure**: Automatic encryption/decryption
✅ **Simple**: One-line credential retrieval
✅ **Type-safe**: TypeScript support with autocomplete
✅ **Flexible**: Easy to add new integrations
✅ **Maintainable**: Changes in one place apply everywhere
