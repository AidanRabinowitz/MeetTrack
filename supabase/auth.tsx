import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Database error fetching user profile:", error.message);
        return null;
      }

      return data;
    } catch (err: any) {
      console.error(
        "Unexpected error fetching user profile:",
        err.message || "Unknown error",
      );
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);

        // Get initial session with retry logic
        let session = null;
        let sessionError = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          const result = await supabase.auth.getSession();
          if (result.error) {
            sessionError = result.error;
            console.warn(
              `Session attempt ${attempt + 1} failed:`,
              result.error.message,
            );
            if (attempt < 2) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * (attempt + 1)),
              );
            }
          } else {
            session = result.data.session;
            sessionError = null;
            break;
          }
        }

        if (sessionError) {
          console.error(
            "Failed to get session after retries:",
            sessionError.message,
          );
          // Clear any stale session data
          try {
            localStorage.removeItem("supabase.auth.token");
            sessionStorage.clear();
          } catch (e) {
            console.warn("Error clearing storage:", e);
          }
        }

        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            try {
              const profile = await fetchUserProfile(session.user.id);
              setUserProfile(profile);
            } catch (profileError: any) {
              console.error(
                "Error fetching user profile:",
                profileError.message,
              );
              // Don't fail auth if profile fetch fails
              setUserProfile(null);
            }
          } else {
            setUserProfile(null);
          }
          setLoading(false);
          setInitializing(false);
        }
      } catch (err: any) {
        console.error("Error initializing auth:", err.message);
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          setInitializing(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log(
        "Auth state change:",
        event,
        session?.user?.id ? "User present" : "No user",
      );

      try {
        // Handle sign out event specifically
        if (event === "SIGNED_OUT") {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            setUserProfile(profile);
          } catch (profileError: any) {
            console.error(
              "Error fetching user profile in auth change:",
              profileError.message,
            );
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }

        if (initializing) {
          setInitializing(false);
        }
        setLoading(false);
      } catch (err: any) {
        console.error("Error in auth state change:", err.message);
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initializing]);

  const signUp = async (email: string, password: string, fullName: string) => {
  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;

    // Return the user if email confirmation isn't required
    if (data.user && !data.user.email_confirmed_at) {
      return { requiresConfirmation: true };
    }

    return data.user;
  } catch (error) {
    throw error;
  } finally {
    setLoading(false);
  }
};

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error(
            "Invalid email or password. Please check your credentials and try again.",
          );
        }
        if (error.message.includes("Email not confirmed")) {
          throw new Error(
            "Please check your email and click the confirmation link before signing in.",
          );
        }
        throw error;
      }

      // Success - user will be set via onAuthStateChange
      return;
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
  setLoading(true);
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut({ scope: "global" });
    
    // Clear all browser storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear Supabase client cache
    await supabase.auth._removeSession();
    
    // Reset local state
    setUser(null);
    setUserProfile(null);
  } catch (error) {
    console.error("Sign out error:", error);
  } finally {
    setLoading(false);
  }
};

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
