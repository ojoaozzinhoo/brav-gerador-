import { createClient } from '@supabase/supabase-js';

// Credenciais fornecidas
const SUPABASE_URL = 'https://ckckmcsmcvupswvjnurc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrY2ttY3NtY3Z1cHN3dmpudXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzQ4ODcsImV4cCI6MjA4MTQxMDg4N30.ro5DOY8y6zVXNoPb9HuSAt0keOHBxDgbdzSrFHuNavM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
