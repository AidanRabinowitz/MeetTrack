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
        // Get initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error.message);
        }

        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            setUserProfile(profile);
          }
          setLoading(false);
          setInitializing(false);
        }
      } catch (err: any) {
        console.error("Error initializing auth:", err.message);
        if (mounted) {
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

      try {
        setUser(session?.user ?? null);

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }

        if (initializing) {
          setInitializing(false);
        }
        setLoading(false);
      } catch (err: any) {
        console.error("Error in auth state change:", err.message);
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
      // Sign up with Supabase Auth - removed admin API call
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        // Handle specific error cases
        if (
          error.message.includes("already registered") ||
          error.message.includes("already exists") ||
          error.message.includes("User already registered")
        ) {
          throw new Error("An account already exists with that email address.");
        }
        if (error.message.includes("invalid email")) {
          throw new Error("Please enter a valid email address.");
        }
        if (error.message.includes("weak password")) {
          throw new Error(
            "Password is too weak. Please choose a stronger password.",
          );
        }
        throw error;
      }

      // Success - user created
      if (data.user && !data.user.email_confirmed_at) {
        // Email confirmation required
        return;
      }
    } catch (error: any) {
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
      // Clear local state first for immediate UI feedback
      setUser(null);
      setUserProfile(null);

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error.message);
        // Don't throw here - user state is already cleared
      }
    } catch (error: any) {
      console.error("Unexpected sign out error:", error.message);
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
