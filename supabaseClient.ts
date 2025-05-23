
import { createClient, SupabaseClient } from 'supabase-js'; // Alterado de URL direta para chave da importmap

// Estas são suas credenciais Supabase reais
const SUPABASE_URL: string = 'https://bykwsieounpkdrdrhnyg.supabase.co';
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3dzaWVvdW5wa2RyZHJobnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDc0MDEsImV4cCI6MjA2MzUyMzQwMX0.AnmTRBfXThZKI5b4T-8eAIscBHT9z6inUN3NZ2TTyL4';

// Estes são os valores de placeholder contra os quais comparamos
const PLACEHOLDER_SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const PLACEHOLDER_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

let supabaseInstance: SupabaseClient | null = null;

// Verifica se a URL e a chave NÃO SÃO os placeholders
const isEffectivelyConfigured =
  SUPABASE_URL && SUPABASE_URL !== PLACEHOLDER_SUPABASE_URL &&
  SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== PLACEHOLDER_SUPABASE_ANON_KEY;

if (isEffectivelyConfigured) {
  try {
    // Valida a estrutura da URL. createClient fará uma validação mais robusta.
    new URL(SUPABASE_URL); // Isso lançará um erro se SUPABASE_URL for fundamentalmente inválida
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.info("Supabase client initialized successfully.");
  } catch (error) {
    console.error(
      "Falha ao inicializar o cliente Supabase. Verifique se SUPABASE_URL em supabaseClient.ts é uma URL válida.",
      error
    );
    // supabaseInstance permanece nulo
  }
} else {
  // Avisos se ainda estiver usando placeholders ou se as chaves estiverem ausentes/vazias.
  if (SUPABASE_URL === PLACEHOLDER_SUPABASE_URL || SUPABASE_ANON_KEY === PLACEHOLDER_SUPABASE_ANON_KEY) {
    console.warn(
      "Supabase URL ou Anon Key ainda estão com os valores de placeholder. " +
      "Por favor, atualize-os em supabaseClient.ts. " +
      "O aplicativo usará o localStorage (se disponível) ou começará vazio, sem conectividade com o banco de dados."
    );
  } else if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
        "Supabase URL ou Anon Key parecem estar ausentes. " +
        "Por favor, verifique a configuração em supabaseClient.ts. " +
        "O aplicativo usará o localStorage (se disponível) ou começará vazio, sem conectividade com o banco de dados."
    );
  } else {
    // Caso em que os valores estão presentes mas a inicialização falhou (ex: URL inválida não pega pelo new URL())
     console.warn(
        "Supabase não está configurado corretamente. Os valores estão presentes mas podem ser inválidos, ou a inicialização falhou. " +
        "Verifique supabaseClient.ts. O aplicativo usará o localStorage."
    );
  }
}

export const supabase = supabaseInstance;

// Esta função agora reflete corretamente se uma instância de cliente utilizável existe
export const isSupabaseConfigured = () => {
  return supabaseInstance !== null;
};