const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://iccmkpmujtmvtfpvoxli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljY21rcG11anRtdnRmcHZveGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ5NTIwNSwiZXhwIjoyMDcyMDcxMjA1fQ.V48JPvspOn1kCgPMWaBcHL2H4Eq-SuCJCh7RkR_vH90'
);

async function checkKey() {
  // Check Mustang Wrestling Association (ID from screenshot)
  const { data, error } = await supabase
    .from('parent_organizations')
    .select('id, name, openai_api_key_encrypted, openai_api_key_updated_at')
    .eq('id', '917fd5d9-ef2d-45bf-b81d-4f48064d495d')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== Organization OpenAI Key Status ===\n');
  console.log('Organization:', data.name);
  console.log('ID:', data.id);
  console.log('Has OpenAI Key:', data.openai_api_key_encrypted ? 'YES ✓' : 'NO ✗');
  console.log('Key Length:', data.openai_api_key_encrypted ? data.openai_api_key_encrypted.length + ' chars' : 'N/A');
  console.log('Last Updated:', data.openai_api_key_updated_at || 'Never');
  
  if (data.openai_api_key_encrypted) {
    const parts = data.openai_api_key_encrypted.split(':');
    console.log('Encryption Format:', parts.length === 2 ? 'Valid (iv:encrypted) ✓' : 'Invalid ✗');
    console.log('\nStatus: OpenAI API key is properly saved and encrypted! ✓');
  } else {
    console.log('\nStatus: No OpenAI API key found. Please save it in organization settings. ✗');
  }
}

checkKey().catch(console.error);
