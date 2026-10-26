import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resolve environment variables across both Node.js (server.ts) and Browser (Vite)
function getEnvVar(key: string): string {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  // Vite client import.meta.env
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch (_e) {
    // ignore
  }
  return '';
}

export const SUPABASE_URL = 
  getEnvVar('VITE_SUPABASE_URL') || 
  getEnvVar('SUPABASE_URL') || 
  '';

export const SUPABASE_KEY = 
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || 
  getEnvVar('VITE_SUPABASE_ANON_KEY') || 
  getEnvVar('SUPABASE_ANON_KEY') || 
  '';

export const SUPABASE_STORAGE_BUCKET = 
  getEnvVar('SUPABASE_STORAGE_BUCKET') || 
  'opf-attachments';

/**
 * Checks whether valid Supabase credentials have been configured
 */
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_URL) &&
    !SUPABASE_URL.includes('your-project') &&
    SUPABASE_URL.startsWith('http') &&
    Boolean(SUPABASE_KEY) &&
    !SUPABASE_KEY.includes('your-anon-key') &&
    !SUPABASE_KEY.includes('your-service-role-key')
  );
}

/**
 * Validasi alamat email kantor: Hanya domain perusahaan @hino.co.id yang diizinkan
 */
export function isValidCorporateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  return /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?hino\.co\.id$/.test(clean);
}

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns singleton Supabase client instance or null if not yet configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  if (isSupabaseConfigured()) {
    try {
      const isBrowser = typeof window !== 'undefined';
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: isBrowser,
          autoRefreshToken: isBrowser,
          detectSessionInUrl: isBrowser,
          storage: isBrowser ? window.localStorage : undefined,
        },
      });
      console.log(`[SUPABASE] Connected to project: ${SUPABASE_URL}`);
      return supabaseInstance;
    } catch (err) {
      console.error('[SUPABASE] Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return null;
}

export const supabase = getSupabaseClient();

/**
 * Uploads a photo / file attachment (Base64 string, Buffer, or File) to Supabase Storage Bucket
 * and returns its public URL.
 */
export async function uploadPhotoToSupabase(
  data: string | Buffer | Uint8Array,
  fileNamePrefix: string = 'part-failure',
  bucketName: string = SUPABASE_STORAGE_BUCKET
): Promise<{ success: boolean; publicUrl: string; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      publicUrl: '',
      error: 'Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
    };
  }

  try {
    let fileBody: Buffer | Uint8Array | Blob;
    let contentType = 'image/jpeg';
    let extension = 'jpg';

    // Handle base64 data URI
    if (typeof data === 'string') {
      if (data.startsWith('data:')) {
        const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          contentType = matches[1];
          const base64Data = matches[2];
          if (contentType.includes('png')) extension = 'png';
          else if (contentType.includes('webp')) extension = 'webp';
          
          if (typeof Buffer !== 'undefined') {
            fileBody = Buffer.from(base64Data, 'base64');
          } else {
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            fileBody = new Uint8Array(byteNumbers);
          }
        } else {
          return { success: false, publicUrl: '', error: 'Format data string base64 tidak valid.' };
        }
      } else if (data.startsWith('http://') || data.startsWith('https://')) {
        // Already a public URL
        return { success: true, publicUrl: data };
      } else {
        // Plain base64 without prefix
        if (typeof Buffer !== 'undefined') {
          fileBody = Buffer.from(data, 'base64');
        } else {
          return { success: false, publicUrl: '', error: 'Tidak dapat mengonversi base64 di browser.' };
        }
      }
    } else {
      fileBody = data;
    }

    const timestamp = Date.now();
    const cleanPrefix = fileNamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const filePath = `uploads/${cleanPrefix}_${timestamp}.${extension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBody, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[SUPABASE STORAGE] Error uploading photo:', uploadError);
      return { success: false, publicUrl: '', error: uploadError.message };
    }

    // Retrieve public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;
    console.log(`[SUPABASE STORAGE] File uploaded successfully: ${publicUrl}`);
    return { success: true, publicUrl };
  } catch (err: any) {
    console.error('[SUPABASE STORAGE] Unexpected error during upload:', err);
    return { success: false, publicUrl: '', error: err.message || 'Gagal mengunggah foto ke Supabase Storage.' };
  }
}
