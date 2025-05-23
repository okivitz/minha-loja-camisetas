
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Using esm.sh for browser compatibility

// IMPORTANT: Replace with your actual Supabase URL and Anon Key
// It's highly recommended to use environment variables for these in a real application
// Explicitly type as string to allow comparison with placeholder literals without type errors.
const SUPABASE_URL: string = 'https://bykwsieounpkdrdrhnyg.supabase.co'; // e.g., 'https://your-project-id.supabase.co'
// Explicitly type as string to allow comparison with placeholder literals without type errors.
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3dzaWVvdW5wa2RyZHJobnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDc0MDEsImV4cCI6MjA2MzUyMzQwMX0.AnmTRBfXThZKI5b4T-8eAIscBHT9z6inUN3NZ2TTyL4'; // e.g., 'eyJh...your-key...c'

let supabaseInstance: SupabaseClient | null = null;

const isEffectivelyConfigured = 
  SUPABASE_URL && SUPABASE_URL !== 'https://bykwsieounpkdrdrhnyg.supabase.co' &&
  SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3dzaWVvdW5wa2RyZHJobnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDc0MDEsImV4cCI6MjA2MzUyMzQwMX0.AnmTRBfXThZKI5b4T-8eAIscBHT9z6inUN3NZ2TTyL4';

if (isEffectivelyConfigured) {
  try {
    // Validate URL structure roughly, createClient will do more robust validation
    new URL(SUPABASE_URL); // This will throw if SUPABASE_URL is fundamentally invalid
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.error(
      "Failed to initialize Supabase client. Please ensure SUPABASE_URL in supabaseClient.ts is a valid URL.",
      error
    );
    // supabaseInstance remains null
  }
} else {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.warn(
      "Supabase URL or Anon Key is not configured. Please update them in supabaseClient.ts. " +
      "The app will use mock data or local state without database connectivity."
    );
  } else if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
        "Supabase URL or Anon Key seems to be missing or invalid. Please check configuration in supabaseClient.ts. " +
        "The app will use mock data or local state without database connectivity."
    );
  }
}

export const supabase = supabaseInstance;

// This function now correctly reflects if a usable client instance exists
export const isSupabaseConfigured = () => {
  return supabaseInstance !== null;
};
