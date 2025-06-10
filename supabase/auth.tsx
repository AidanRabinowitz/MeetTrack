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
    authLog("Starting sign out process");
    setLoading(true);
    try {
      // Sign out from Supabase first
      authLog("Calling supabase.auth.signOut");
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        authError("Supabase sign out error", error);
      } else {
        authLog("Supabase sign out successful");
      }

      // Clear all storage
      try {
        authLog("Clearing browser storage");
        // Clear specific Supabase keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("supabase")) {
            keysToRemove.push(key);
          }
        }
        authLog(`Found ${keysToRemove.length} Supabase keys to remove`);
        keysToRemove.forEach((key) => localStorage.removeItem(key));

        // Clear session storage
        sessionStorage.clear();

        authLog("Storage cleared successfully");
      } catch (storageError) {
        authError("Error clearing storage", storageError);
      }

      // Clear local state
      authLog("Clearing local auth state");
      setUser(null);
      setUserProfile(null);

      authLog("Sign out completed successfully");
    } catch (error: any) {
      authError("Unexpected sign out error", error);
      // Still clear local state even if there's an error
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
      authLog("Sign out process finished");
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
