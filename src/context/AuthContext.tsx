import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, UserProfile, RolePermissions, getRolePermissions } from '../types';
import { supabase, isSupabaseConfigured, isValidCorporateEmail } from '../lib/supabase';

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  role: UserRole;
  permissions: RolePermissions;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password?: string, role?: UserRole, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  quickDemoLogin: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'hino_ofp_auth_user';
const LOCAL_STORAGE_PROFILE_KEY = 'hino_ofp_auth_profile';

// Akun Demo resmi kantor Hino Indonesia untuk pengujian instan
export const DEMO_ACCOUNTS: Record<UserRole, { email: string; name: string; department: string }> = {
  'Super Admin': {
    email: 'superadmin@hino.co.id',
    name: 'Bambang Sudiro',
    department: 'HMSI Central Field Quality & Management',
  },
  'Tim Quality': {
    email: 'qa.inspector@hino.co.id',
    name: 'Andi Wijaya',
    department: 'HMSI Quality Assurance & Technical Review',
  },
  'Tim Area': {
    email: 'area.coordinator@hino.co.id',
    name: 'Rahmat Hidayat',
    department: 'HMSI Area Coordinator Regional Jabodetabek',
  },
  'Tim Viewer': {
    email: 'viewer.management@hino.co.id',
    name: 'Siti Nurhaliza',
    department: 'HMSI Logistics & Management Monitoring',
  },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ambil role dari profile, default ke 'Tim Viewer'
  const role: UserRole = profile?.role || 'Tim Viewer';
  const permissions: RolePermissions = getRolePermissions(role);

  // 1. Inisialisasi Sesi: Cek LocalStorage dan Supabase Session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        setIsLoading(true);

        // A. Cek Supabase Auth Session jika terhubung
        if (isSupabaseConfigured() && supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData && sessionData.session?.user) {
            const sbUser = sessionData.session.user;
            const email = sbUser.email || '';

            // Coba ambil profile dari tabel public.profiles di Supabase
            let fetchedRole: UserRole = 'Tim Viewer';
            let fullName = sbUser.user_metadata?.full_name || email.split('@')[0];

            try {
              const { data: profData, error: profError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sbUser.id)
                .single();

              if (!profError && profData && profData.role) {
                fetchedRole = profData.role as UserRole;
                if (profData.full_name) fullName = profData.full_name;
              } else if (sbUser.user_metadata?.role) {
                fetchedRole = sbUser.user_metadata.role as UserRole;
              }
            } catch (_err) {
              if (sbUser.user_metadata?.role) {
                fetchedRole = sbUser.user_metadata.role as UserRole;
              }
            }

            if (isMounted) {
              const userObj = { id: sbUser.id, email };
              const profObj: UserProfile = {
                id: sbUser.id,
                email,
                role: fetchedRole,
                full_name: fullName,
                department: sbUser.user_metadata?.department || 'Hino Motors Sales Indonesia',
              };

              setUser(userObj);
              setProfile(profObj);
              localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userObj));
              localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profObj));
              setIsLoading(false);
              return;
            }
          }
        }

        // B. Fallback ke session tersimpan di LocalStorage (Session Persistence)
        const savedUserStr = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        const savedProfileStr = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);

        if (savedUserStr && savedProfileStr) {
          const parsedUser = JSON.parse(savedUserStr);
          const parsedProfile = JSON.parse(savedProfileStr);
          if (isMounted) {
            setUser(parsedUser);
            setProfile(parsedProfile);
          }
        }
      } catch (err) {
        console.warn('[AUTH] Error initializing session:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    // Listener perubahan state autentikasi Supabase
    if (isSupabaseConfigured() && supabase) {
      const client = supabase;
      const { data: authListener } = client.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const email = session.user.email || '';
          let userRole: UserRole = (session.user.user_metadata?.role as UserRole) || 'Tim Viewer';

          try {
            const { data } = await client.from('profiles').select('*').eq('id', session.user.id).single();
            if (data?.role) userRole = data.role as UserRole;
          } catch {}

          const u = { id: session.user.id, email };
          const p: UserProfile = {
            id: session.user.id,
            email,
            role: userRole,
            full_name: session.user.user_metadata?.full_name || email.split('@')[0],
          };
          setUser(u);
          setProfile(p);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(u));
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(p));
        } else if (!localStorage.getItem(LOCAL_STORAGE_USER_KEY)) {
          setUser(null);
          setProfile(null);
        }
      });

      return () => {
        isMounted = false;
        authListener?.subscription?.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fungsi Login menggunakan Supabase Auth dengan Validasi Domain Kantor @hino.co.id
  const login = async (email: string, password: string = 'HinoSecure2026!'): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // Validasi domain perusahaan
    if (!isValidCorporateEmail(cleanEmail)) {
      return {
        success: false,
        error: 'Akses ditolak: Hanya alamat email resmi kantor Hino Motors dengan domain @hino.co.id yang diizinkan masuk ke sistem.',
      };
    }

    // A. Login via Supabase Auth jika terhubung
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          // Jika akun belum terdaftar di Supabase Auth, coba otomatis sign up akun kantor demo
          if (error.message.toLowerCase().includes('invalid login credentials') || error.message.toLowerCase().includes('user not found')) {
            const signUpRes = await signUp(cleanEmail, password, 'Tim Quality', cleanEmail.split('@')[0]);
            if (signUpRes.success) return { success: true };
          }
          return { success: false, error: `Supabase Auth: ${error.message}` };
        }

        if (data.user) {
          let userRole: UserRole = 'Tim Quality';

          // Coba baca role dari tabel profiles
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            if (prof?.role) userRole = prof.role as UserRole;
            else if (data.user.user_metadata?.role) userRole = data.user.user_metadata.role;
          } catch {
            if (data.user.user_metadata?.role) userRole = data.user.user_metadata.role;
          }

          const userObj = { id: data.user.id, email: cleanEmail };
          const profObj: UserProfile = {
            id: data.user.id,
            email: cleanEmail,
            role: userRole,
            full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
            department: 'PT Hino Motors Sales Indonesia (HMSI)',
          };

          setUser(userObj);
          setProfile(profObj);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userObj));
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profObj));
          return { success: true };
        }
      } catch (err: any) {
        console.error('[AUTH] Login exception:', err);
      }
    }

    // B. Fallback Instant Corporate Login (Simulasi & Session Persistence)
    let detectedRole: UserRole = 'Tim Quality';
    if (cleanEmail.includes('admin') || cleanEmail.includes('super')) detectedRole = 'Super Admin';
    else if (cleanEmail.includes('area')) detectedRole = 'Tim Area';
    else if (cleanEmail.includes('viewer')) detectedRole = 'Tim Viewer';

    const fallbackUser = { id: `hino_${Date.now()}`, email: cleanEmail };
    const fallbackProfile: UserProfile = {
      id: fallbackUser.id,
      email: cleanEmail,
      role: detectedRole,
      full_name: cleanEmail.split('@')[0].replace('.', ' ').toUpperCase(),
      department: 'PT Hino Motors Sales Indonesia',
    };

    setUser(fallbackUser);
    setProfile(fallbackProfile);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(fallbackUser));
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(fallbackProfile));

    return { success: true };
  };

  // 3. Fungsi Pendaftaran / Registrasi Pengguna Baru
  const signUp = async (
    email: string,
    password: string = 'HinoSecure2026!',
    userRole: UserRole = 'Tim Quality',
    fullName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidCorporateEmail(cleanEmail)) {
      return {
        success: false,
        error: 'Pendaftaran gagal: Wajib menggunakan domain email resmi @hino.co.id.',
      };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              role: userRole,
              full_name: fullName || cleanEmail.split('@')[0],
              department: 'PT Hino Motors Sales Indonesia',
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Buat entri profil di public.profiles jika tabel tersedia
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: cleanEmail,
              role: userRole,
              full_name: fullName || cleanEmail.split('@')[0],
              department: 'PT Hino Motors Sales Indonesia',
              updated_at: new Date().toISOString(),
            });
          } catch {}

          const userObj = { id: data.user.id, email: cleanEmail };
          const profObj: UserProfile = {
            id: data.user.id,
            email: cleanEmail,
            role: userRole,
            full_name: fullName || cleanEmail.split('@')[0],
          };
          setUser(userObj);
          setProfile(profObj);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userObj));
          localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profObj));
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Gagal mendaftar ke Supabase.' };
      }
    }

    // Fallback pendaftaran lokal
    const fallbackUser = { id: `hino_${Date.now()}`, email: cleanEmail };
    const fallbackProfile: UserProfile = {
      id: fallbackUser.id,
      email: cleanEmail,
      role: userRole,
      full_name: fullName || cleanEmail.split('@')[0],
    };
    setUser(fallbackUser);
    setProfile(fallbackProfile);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(fallbackUser));
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(fallbackProfile));
    return { success: true };
  };

  // 4. Logout Sesi Pengguna
  const logout = async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Error during sign out:', e);
    } finally {
      setUser(null);
      setProfile(null);
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    }
  };

  // 5. Ganti Role Cepat (Role Switcher untuk pengujian izin & workflow)
  const switchRole = (newRole: UserRole) => {
    if (!profile) return;
    const updatedProfile: UserProfile = {
      ...profile,
      role: newRole,
    };
    setProfile(updatedProfile);
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updatedProfile));

    // Sinkronkan ke Supabase profiles jika terhubung
    if (isSupabaseConfigured() && supabase && user?.id) {
      supabase.from('profiles').update({ role: newRole }).eq('id', user.id).then();
    }
  };

  // 6. Quick Demo Login untuk 4 Tingkatan Role
  const quickDemoLogin = (targetRole: UserRole) => {
    const demo = DEMO_ACCOUNTS[targetRole];
    const demoUser = { id: `demo_${targetRole.toLowerCase().replace(/\s+/g, '_')}`, email: demo.email };
    const demoProfile: UserProfile = {
      id: demoUser.id,
      email: demo.email,
      role: targetRole,
      full_name: demo.name,
      department: demo.department,
    };

    setUser(demoUser);
    setProfile(demoProfile);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(demoProfile));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        permissions,
        isLoading,
        login,
        signUp,
        logout,
        switchRole,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
};
