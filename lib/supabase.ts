import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Service role client — bypasses RLS, used for data queries with explicit user_id filtering
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Anon key client — used for JWT verification via Supabase Auth
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
