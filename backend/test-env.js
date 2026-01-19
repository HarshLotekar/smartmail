import dotenv from 'dotenv';
dotenv.config();

console.log('Testing environment variables:');
console.log('GOOGLE_CLIENT_ID Length:', process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.length : 'MISSING');
console.log('GOOGLE_CLIENT_SECRET Length:', process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.length : 'MISSING');
console.log('First 20 chars of CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 20) : 'MISSING');
console.log('First 10 chars of CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.substring(0, 10) : 'MISSING');