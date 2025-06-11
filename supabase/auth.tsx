import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
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
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Enhanced debug logging
const debugLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[AUTH DEBUG] ${message}`, data || "");
  }
};

const errorLog = (message: string, error?: any) => {
  console.error(`[AUTH ERROR] ${message}`, error || "");
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const debugAuthState = useCallback(async () => {
    console.group("🔍 Auth Debug Information");
    console.log("React State:", {
      user: user?.id || null,
      userProfile: userProfile?.id || null,
      loading,
      initialized,
      sessionExists: !!session,
    });

    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();
      console.log("Supabase Session:", {
        exists: !!currentSession,
        userId: currentSession?.user?.id || null,
        expiresAt: currentSession?.expires_at
          ? new Date(currentSession.expires_at * 1000).toISOString()
          : null,
        error: error?.message || null,
      });

      console.log("LocalStorage Auth Items:");
      const authKeys = Object.keys(localStorage).filter(
        (key) => key.includes("auth") || key.startsWith("sb-"),
      );
      authKeys.forEach((key) => {
        const value = localStorage.getItem(key);
        console.log(key, value ? `${value.substring(0, 50)}...` : null);
      });

      // Check if session is expired
      if (currentSession?.expires_at) {
        const isExpired = currentSession.expires_at * 1000 < Date.now();
        console.log("Session Status:", isExpired ? "EXPIRED" : "VALID");
      }
    } catch (err) {
      console.error("Error getting session:", err);
    }

    console.groupEnd();
  }, [user, userProfile, loading, initialized, session]);
  const fetchUserProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      try {
        debugLog(`Fetching user profile for ID: ${userId}`);

        const { data, error } = await supabase
          .from("users")
          .select("id, email, full_name, created_at, updated_at")
          .eq("id", userId)
          .single();

        if (error) {
          errorLog("Error fetching user profile", error);
          return null;
        }

        debugLog("User profile fetched successfully", { email: data?.email });
        return data;
      } catch (err: any) {
        errorLog("Unexpected error fetching user profile", err);
        return null;
      }
    },
    [],
  );
  // Clear auth storage function
  const clearAuthStorage = useCallback(async () => {
    debugLog("Clearing auth storage");

    // Clear all Supabase-related localStorage items
    const keysToRemove = Object.keys(localStorage).filter(
      (key) =>
        key.startsWith("sb-") ||
        key.includes("auth-token") ||
        key.includes("supabase"),
    );

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      debugLog(`Removed localStorage key: ${key}`);
    });

    // Clear sessionStorage as well
    const sessionKeysToRemove = Object.keys(sessionStorage).filter(
      (key) =>
        key.startsWith("sb-") ||
        key.includes("auth-token") ||
        key.includes("supabase"),
    );

    sessionKeysToRemove.forEach((key) => {
      sessionStorage.removeItem(key);
      debugLog(`Removed sessionStorage key: ${key}`);
    });

    // Clear cookies that might be set by Supabase
    document.cookie.split(";").forEach((cookie) => {
      const [name] = cookie.split("=");
      const trimmedName = name.trim();
      if (trimmedName.startsWith("sb-") || trimmedName.includes("supabase")) {
        document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        debugLog(`Cleared cookie: ${trimmedName}`);
      }
    });
  }, []);
  const createUserProfile = useCallback(
    async (user: User): Promise<UserProfile | null> => {
      try {
        debugLog(`Creating user profile for: ${user.email}`);

        const profileData = {
          id: user.id,
          user_id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "",
          token_identifier: user.email || user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("users")
          .upsert(profileData, { onConflict: "id" })
          .select("id, email, full_name, created_at, updated_at")
          .single();

        if (error) {
          errorLog("Error creating user profile", error);
          // Return basic profile data even if DB insert fails
          return {
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }

        debugLog("User profile created successfully");
        return data;
      } catch (err: any) {
        errorLog("Unexpected error creating user profile", err);
        return null;
      }
    },
    [],
  );

  // Refresh session function
  const refreshSession = useCallback(async () => {
    try {
      debugLog("Refreshing session...");
      setLoading(true);

      const {
        data: { session: refreshedSession },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        errorLog("Session refresh failed", error);
        await clearAuthStorage();
        setUser(null);
        setUserProfile(null);
        setSession(null);
        return;
      }

      if (refreshedSession) {
        debugLog("Session refreshed successfully");
        setSession(refreshedSession);
        setUser(refreshedSession.user);

        const profile =
          (await fetchUserProfile(refreshedSession.user.id)) ||
          (await createUserProfile(refreshedSession.user));
        setUserProfile(profile);
      }
    } catch (err) {
      errorLog("Error refreshing session", err);
      await clearAuthStorage();
      setUser(null);
      setUserProfile(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [clearAuthStorage, fetchUserProfile, createUserProfile]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        debugLog("Initializing auth...");
        setLoading(true);

        // Get the current session
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          errorLog("Session initialization error", error);
          await clearAuthStorage();
          setUser(null);
          setUserProfile(null);
          setSession(null);
          return;
        }

        if (currentSession) {
          debugLog("Found existing session", {
            userId: currentSession.user.id,
          });

          // Check if session is expired
          const isExpired =
            currentSession.expires_at &&
            currentSession.expires_at * 1000 < Date.now();

          if (isExpired) {
            debugLog("Session is expired, attempting refresh");
            await refreshSession();
            return;
          }

          // Validate session with a test query
          try {
            const { error: validationError } = await supabase
              .from("users")
              .select("id")
              .eq("id", currentSession.user.id)
              .limit(1)
              .single();

            if (validationError && validationError.code !== "PGRST116") {
              debugLog(
                "Session validation failed, clearing auth",
                validationError,
              );
              await clearAuthStorage();
              setUser(null);
              setUserProfile(null);
              setSession(null);
              return;
            }
          } catch (validationErr) {
            debugLog(
              "Session validation error, continuing anyway",
              validationErr,
            );
          }

          // Fetch or create user profile
          const profile =
            (await fetchUserProfile(currentSession.user.id)) ||
            (await createUserProfile(currentSession.user));

          if (mounted) {
            setSession(currentSession);
            setUser(currentSession.user);
            setUserProfile(profile);
            debugLog("Auth initialized successfully", {
              userId: currentSession.user.id,
            });
          }
        } else {
          debugLog("No existing session found");
          setUser(null);
          setUserProfile(null);
          setSession(null);
        }
      } catch (err) {
        errorLog("Auth initialization error", err);
        await clearAuthStorage();
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      debugLog(`Auth state changed: ${event}`, {
        sessionExists: !!newSession,
        userId: newSession?.user?.id || null,
      });

      setLoading(true);

      try {
        if (
          event === "SIGNED_OUT" ||
          (event === "TOKEN_REFRESHED" && !newSession)
        ) {
          debugLog("User signed out or token refresh failed");
          await clearAuthStorage();
          if (mounted) {
            setUser(null);
            setUserProfile(null);
            setSession(null);
          }
        } else if (
          newSession &&
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
        ) {
          debugLog(`Processing ${event} event`);

          const profile =
            (await fetchUserProfile(newSession.user.id)) ||
            (await createUserProfile(newSession.user));

          if (mounted) {
            setSession(newSession);
            setUser(newSession.user);
            setUserProfile(profile);
          }
        }
      } catch (err) {
        errorLog(`Error handling auth state change (${event})`, err);
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [clearAuthStorage, fetchUserProfile, createUserProfile, refreshSession]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && initialized && !loading) {
        debugLog("Page became visible, checking session");

        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (
          currentSession &&
          (!session || session.access_token !== currentSession.access_token)
        ) {
          debugLog("Session changed while page was hidden, refreshing");
          await refreshSession();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialized, loading, session, refreshSession]);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        debugLog(`Attempting sign up for: ${email}`);
        setLoading(true);

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
          errorLog("Sign up error", error);

          if (
            error.message.includes("already registered") ||
            error.message.includes("already exists") ||
            error.message.includes("User already registered")
          ) {
            throw new Error(
              "An account already exists with that email address.",
            );
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

        debugLog("Sign up successful", { userId: data.user?.id });
        return;
      } catch (error: any) {
        errorLog("Sign up failed", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        debugLog(`Attempting sign in for: ${email}`);
        setLoading(true);

        // Clear any existing stale auth data first
        await clearAuthStorage();

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          errorLog("Sign in error", error);

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

        debugLog("Sign in successful", { userId: data.user?.id });
        // Success - auth state will be updated via onAuthStateChange
        return;
      } catch (error: any) {
        errorLog("Sign in failed", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [clearAuthStorage],
  );

  const signOut = useCallback(async () => {
    try {
      debugLog("Attempting sign out");
      setLoading(true);

      // First sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        errorLog("Sign out error", error);
        // Continue with cleanup even if signOut fails
      }

      // Clear all auth storage
      await clearAuthStorage();

      // Clear state immediately
      setUser(null);
      setUserProfile(null);
      setSession(null);

      debugLog("Sign out completed");
    } catch (error) {
      errorLog("Sign out failed", error);
      // Still clear local state even if there's an error
      await clearAuthStorage();
      setUser(null);
      setUserProfile(null);
      setSession(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [clearAuthStorage]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        session,
        signIn,
        signUp,
        signOut,
        refreshSession,
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
