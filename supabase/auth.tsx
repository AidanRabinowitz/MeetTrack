import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const supabaseProjectId = import.meta.env.SUPABASE_PROJECT_ID || "";

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
  const debugAuthState = async () => {
    console.group("Auth Debug Information");
    console.log("React State:", { user, userProfile, loading });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log("Supabase Session:", session);

    console.log("LocalStorage Auth Items:");
    Object.keys(localStorage).forEach((key) => {
      if (key.includes("auth") || key.startsWith("sb-")) {
        console.log(key, localStorage.getItem(key));
      }
    });

    console.groupEnd();
  };
  const fetchUserProfile = async (
    userId: string,
  ): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, created_at, updated_at")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }

      return data;
    } catch (err: any) {
      console.error("Unexpected error fetching user profile:", err);
      return null;
    }
  };
  // Add this effect to handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await recoverSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  const createUserProfile = async (user: User): Promise<UserProfile | null> => {
    try {
      const profileData = {
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata?.full_name || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("users")
        .upsert(profileData)
        .select()
        .single();

      if (error) {
        console.error("Error creating user profile:", error);
        return profileData;
      }

      return data;
    } catch (err: any) {
      console.error("Unexpected error creating user profile:", err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);

        // Get the current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("Session error:", error);
          await clearAuthStorage();
          return;
        }

        if (session) {
          // Validate session with a test query
          const { error: validationError } = await supabase
            .from("users")
            .select("id")
            .eq("id", session.user.id)
            .single();

          if (validationError) {
            console.error("Session validation failed:", validationError);
            await clearAuthStorage();
            return;
          }

          // Fetch user profile
          const profile =
            (await fetchUserProfile(session.user.id)) ||
            (await createUserProfile(session.user));

          if (mounted) {
            setUser(session.user);
            setUserProfile(profile);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        await clearAuthStorage();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("Auth state changed:", event);

      if (event === "SIGNED_OUT") {
        await clearAuthStorage();
        if (mounted) {
          setUser(null);
          setUserProfile(null);
        }
      } else if (session) {
        setLoading(true);
        const profile =
          (await fetchUserProfile(session.user.id)) ||
          (await createUserProfile(session.user));
        if (mounted) {
          setUser(session.user);
          setUserProfile(profile);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);
  const clearAuthStorage = async () => {
    // Clear all Supabase-related localStorage items
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("auth-token")) {
        localStorage.removeItem(key);
      }
    });

    // Clear cookies that might be set by Supabase
    document.cookie.split(";").forEach((cookie) => {
      const [name] = cookie.split("=");
      if (name.trim().startsWith("sb-")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
  };

  const recoverSession = async () => {
    setLoading(true);
    try {
      // Force refresh the session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        await clearAuthStorage();
        return false;
      }

      if (session) {
        const profile =
          (await fetchUserProfile(session.user.id)) ||
          (await createUserProfile(session.user));
        setUser(session.user);
        setUserProfile(profile);
        return true;
      }

      return false;
    } catch (err) {
      await clearAuthStorage();
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Call this when your app detects auth state mismatch
  // For example, in your root layout or main component
  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
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

      // User created successfully
      return;
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

      // Success - auth state will be updated via onAuthStateChange
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
      // First sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
        throw error;
      }

      // Manually clear all Supabase auth items from localStorage
      const itemsToRemove = [
        `sb-${process.env.supabaseProjectId}-auth-token`,
        `sb-${process.env.supabaseProjectId}-auth-token-expires-at`,
        `sb-${process.env.supabaseProjectId}-auth-event`,
      ];

      itemsToRemove.forEach((item) => localStorage.removeItem(item));

      // Clear state
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signOut,
        debugAuthState,
      }}
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
