/**
 * Test team header image upload
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testHeaderUpload() {
  try {
    console.log('=== Testing Team Header Upload ===\n');

    // Get first team
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, header_image_url')
      .limit(1)
      .single();

    if (teamsError) {
      console.error('Error getting team:', teamsError);
      return;
    }

    console.log(`Testing with team: ${teams.name}`);
    console.log(`Team ID: ${teams.id}`);
    console.log(`Current header_image_url: ${teams.header_image_url || '(none)'}\n`);

    // Check if test image exists
    const testImagePath = '/mnt/c/Users/chad/Downloads/SCVWA_Folkstyle_Schedule.jpg';

    if (!fs.existsSync(testImagePath)) {
      console.log('⚠️  Test image not found at:', testImagePath);
      console.log('Please provide a test image path or we can create a simple test.\n');

      // Try to find any image in Downloads
      const downloadsDir = '/mnt/c/Users/chad/Downloads';
      if (fs.existsSync(downloadsDir)) {
        const files = fs.readdirSync(downloadsDir).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
        if (files.length > 0) {
          console.log('Available images in Downloads:');
          files.slice(0, 5).forEach(f => console.log(`  - ${f}`));
        }
      }
      return;
    }

    console.log('Reading test image...');
    const fileBuffer = fs.readFileSync(testImagePath);
    const fileStats = fs.statSync(testImagePath);
    console.log(`✓ Image loaded: ${Math.round(fileStats.size / 1024)}KB\n`);

    // Upload to storage
    const fileName = `${teams.id}-header-${Date.now()}.jpg`;
    const filePath = `teams/${fileName}`;

    console.log(`Uploading to: ${filePath}...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('team-assets')
      .upload(filePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return;
    }

    console.log('✅ Upload successful!\n');

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('team-assets')
      .getPublicUrl(filePath);

    console.log(`Public URL: ${publicUrl}\n`);

    // Update team record
    console.log('Updating team record...');
    const { error: updateError } = await supabase
      .from('teams')
      .update({ header_image_url: publicUrl })
      .eq('id', teams.id);

    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return;
    }

    console.log('✅ Team record updated!\n');

    // Verify the update
    const { data: updatedTeam, error: verifyError } = await supabase
      .from('teams')
      .select('id, name, header_image_url')
      .eq('id', teams.id)
      .single();

    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }

    console.log('=== Test Complete ===');
    console.log(`Team: ${updatedTeam.name}`);
    console.log(`Header URL: ${updatedTeam.header_image_url}`);
    console.log('\n✨ Upload feature is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testHeaderUpload();
