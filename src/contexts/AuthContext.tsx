import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'staff' | 'client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  clientId: string | null;
  onboardingCompleted: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string): Promise<{ role: AppRole | null; isApproved: boolean }> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, is_approved')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return { role: null, isApproved: false };
      }

      if (!data) {
        return { role: null, isApproved: false };
      }

      const role = data.role as AppRole;
      const isApproved = data.is_approved ?? false;
      
      // Admin and staff need approval, clients need approval AND client_users assignment
      if (role === 'admin') {
        return { role, isApproved: true };
      }
      
      if (role === 'staff') {
        return { role: isApproved ? role : null, isApproved };
      }
      
      // For clients, check is_approved - they can access portal even without client_users
      // The portal will show empty state if no clientId is assigned
      return { role: isApproved ? role : null, isApproved };
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return { role: null, isApproved: false };
    }
  };

  const fetchClientId = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching client ID:', error);
        return null;
      }

      return data?.client_id || null;
    } catch (err) {
      console.error('Error in fetchClientId:', err);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer fetching additional data
        if (session?.user) {
          setTimeout(async () => {
            const { role } = await fetchUserRole(session.user.id);
            setUserRole(role);
            
            if (role === 'client') {
              const cId = await fetchClientId(session.user.id);
              setClientId(cId);
            } else {
              setClientId(null);
            }
            setIsLoading(false);
          }, 0);
        } else {
          setUserRole(null);
          setClientId(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { role } = await fetchUserRole(session.user.id);
        setUserRole(role);
        
        if (role === 'client') {
          const cId = await fetchClientId(session.user.id);
          setClientId(cId);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setClientId(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      clientId,
      isLoading,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
