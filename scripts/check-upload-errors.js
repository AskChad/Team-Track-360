/**
 * Check for upload-related errors in production
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUploadErrors() {
  try {
    console.log('=== Checking for upload-related activity ===\n');

    // Check activity_log for upload errors if it exists
    const { data: logs, error: logsError } = await supabase
      .from('activity_log')
      .select('*')
      .or('action.ilike.%upload%,details.ilike.%upload%,details.ilike.%header%,details.ilike.%image%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (logsError) {
      if (logsError.code === '42P01') {
        console.log('ℹ️  activity_log table does not exist yet\n');
      } else {
        console.error('Error querying activity_log:', logsError);
      }
    } else {
      console.log(`Found ${logs?.length || 0} upload-related activity log entries:\n`);
      if (logs && logs.length > 0) {
        logs.forEach(log => {
          console.log(`[${log.created_at}] ${log.action}`);
          console.log(`  User: ${log.user_id}`);
          console.log(`  Details: ${JSON.stringify(log.details)}`);
          console.log('');
        });
      }
    }

    // Check system_events for errors
    const { data: events, error: eventsError } = await supabase
      .from('system_events')
      .select('*')
      .or('event_type.ilike.%error%,metadata.ilike.%upload%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (eventsError) {
      if (eventsError.code === '42P01') {
        console.log('ℹ️  system_events table does not exist yet\n');
      } else {
        console.error('Error querying system_events:', eventsError);
      }
    } else {
      console.log(`Found ${events?.length || 0} error events:\n`);
      if (events && events.length > 0) {
        events.forEach(event => {
          console.log(`[${event.created_at}] ${event.event_type}`);
          console.log(`  ${event.description}`);
          console.log(`  Metadata: ${JSON.stringify(event.metadata)}`);
          console.log('');
        });
      }
    }

    // Check temp-uploads for any failed attempts
    console.log('=== Checking temp-uploads for orphaned files ===\n');
    const { data: tempFiles, error: tempError } = await supabase.storage
      .from('temp-uploads')
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (tempError) {
      console.error('Error listing temp-uploads:', tempError);
    } else {
      console.log(`Found ${tempFiles?.length || 0} items in temp-uploads root\n`);
      if (tempFiles && tempFiles.length > 0) {
        for (const item of tempFiles) {
          console.log(`${item.name} (${item.created_at})`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUploadErrors();
