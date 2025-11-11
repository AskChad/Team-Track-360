const crypto = require('crypto');

const ENCRYPTION_KEY = 'sKxBaUHLQGFv+cbrPMJEv4F49XXuq2FOs9Lb2RXCb1A=';

// Get the encrypted key from database
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://iccmkpmujtmvtfpvoxli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljY21rcG11anRtdnRmcHZveGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ5NTIwNSwiZXhwIjoyMDcyMDcxMjA1fQ.V48JPvspOn1kCgPMWaBcHL2H4Eq-SuCJCh7RkR_vH90'
);

function decrypt(encrypted) {
  try {
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'base64'),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    throw new Error('Failed to decrypt data: ' + error.message);
  }
}

async function test() {
  const { data, error } = await supabase
    .from('parent_organizations')
    .select('openai_api_key_encrypted')
    .eq('id', '917fd5d9-ef2d-45bf-b81d-4f48064d495d')
    .single();

  if (error) {
    console.error('Database error:', error);
    return;
  }

  console.log('\n=== Testing Decryption ===\n');
  console.log('Encrypted key length:', data.openai_api_key_encrypted.length);
  console.log('Encrypted key format:', data.openai_api_key_encrypted.substring(0, 50) + '...');
  
  try {
    const decrypted = decrypt(data.openai_api_key_encrypted);
    console.log('\n✓ Decryption SUCCESSFUL!');
    console.log('Decrypted key starts with:', decrypted.substring(0, 3));
    console.log('Decrypted key length:', decrypted.length);
    
    if (decrypted.startsWith('sk-')) {
      console.log('\n✓ OpenAI API key format is VALID!');
    } else {
      console.log('\n✗ WARNING: Decrypted key does not start with "sk-"');
    }
  } catch (error) {
    console.error('\n✗ Decryption FAILED:', error.message);
  }
}

test().catch(console.error);
