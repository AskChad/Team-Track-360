/**
 * Create Platform Admin User
 *
 * This script creates a platform admin user in the database.
 */

const path = require('path');
const dotenvPath = path.join(__dirname, '..', '.env.local');
require('dotenv').config({ path: dotenvPath });

const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcrypt'));
const { createClient } = require(path.join(__dirname, '..', 'node_modules', '@supabase', 'supabase-js'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createPlatformAdmin(email, password, fullName) {
  try {
    console.log('Creating platform admin user...');
    console.log('Email:', email);

    // Hash password
    console.log('Hashing password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Check if user already exists
    console.log('Checking if user already exists...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('User already exists!');
      console.log('Current role:', existingUser.role);

      if (existingUser.role === 'platform_admin') {
        console.log('✅ User is already a platform admin');
        return;
      }

      // Update existing user to platform_admin
      console.log('Updating user role to platform_admin...');
      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({
          role: 'platform_admin',
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        throw updateError;
      }

      console.log('✅ User updated to platform_admin successfully!');
      console.log('User ID:', updated.id);
      return;
    }

    // Create new user
    console.log('Creating new user...');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email,
        password_hash: passwordHash,
        full_name: fullName || 'Platform Admin',
        role: 'platform_admin',
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('✅ Platform admin user created successfully!');
    console.log('User ID:', newUser.id);
    console.log('Email:', newUser.email);
    console.log('Role:', newUser.role);

  } catch (error) {
    console.error('Failed to create platform admin:', error);
    process.exit(1);
  }
}

// Get credentials from command line or use defaults
const email = process.argv[2] || 'chad@askchad.net';
const password = process.argv[3] || 'qjt-gph9cwq2GUN5gve';
const fullName = process.argv[4] || 'Chad (Platform Admin)';

createPlatformAdmin(email, password, fullName)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
