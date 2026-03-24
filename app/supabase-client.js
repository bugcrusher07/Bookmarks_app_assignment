'use client'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});


// {
//   "name": "abstrabitassignment",
//   "version": "0.1.0",
//   "private": true,
//   "scripts": {
//     "dev": "next dev",
//     "build": "next build",
//     "start": "next start",
//     "lint": "eslint"
//   },
//   "dependencies": {
//     "@supabase/supabase-js": "^2.98.0",
//     "mongodb": "~7.1.0",
//     "next": "16.1.6",
//     "react": "19.2.3",
//     "react-dom": "19.2.3",
//     "three": "^0.183.0"
//   },
//   "devDependencies": {
//     "@types/node": "25.3.0",
//     "@types/react": "19.2.14",
//     "eslint": "^9",
//     "eslint-config-next": "16.1.6"
//   }
// }