import { Database } from '@/lib/database.types';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>('https://jfzisybugkzcatmuphnv.supabase.co', process.env.SUPABASE_SECRET_TOKEN!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Access auth admin api
export const adminAuthClient = supabase.auth.admin;
