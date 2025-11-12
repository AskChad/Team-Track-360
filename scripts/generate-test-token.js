/**
 * Generate a test JWT token
 */

require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const payload = {
  userId: '34b1a44c-9475-459a-a4c5-ddef4c15b369',
  email: 'chad@askchad.net',
  role: 'platform_admin'
};

const token = jwt.sign(payload, JWT_SECRET);

console.log('Generated token:');
console.log(token);
console.log('\nTest with:');
console.log(`Authorization: Bearer ${token}`);
