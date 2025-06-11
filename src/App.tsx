import { Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useRoutes,
} from "react-router-dom";
import routes from "tempo-routes";
import LoginForm from "./components/auth/LoginForm";
import SignUpForm from "./components/auth/SignUpForm";
import Dashboard from "./components/pages/dashboard";
import Success from "./components/pages/success";
import Home from "./components/pages/home";
import PrivacyPolicyPage from "./components/pages/PrivacyPolicyPage";
import TermsOfServicePage from "./components/pages/TermsOfServicePage";
import SupportPage from "./components/pages/SupportPage";
import { AuthProvider, useAuth } from "../supabase/auth";
import { PowerliftingProvider } from "./contexts/PowerliftingContext";
import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from "./components/common/ErrorBoundary";
import OfflineIndicator from "./components/common/OfflineIndicator";
import PWAInstallPrompt from "./components/common/PWAInstallPrompt";
import { useState } from "react";
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, session, debugAuthState } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Enhanced debugging for private routes
  if (import.meta.env.DEV) {
    console.log("[PrivateRoute] State:", {
      userId: user?.id || null,
      loading,
      sessionExists: !!session,
      retryCount,
      timestamp: new Date().toISOString(),
    });
  }

  // Show loading state with retry option
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400 mb-4">Checking authentication...</p>
          
          {retryCount > 0 && (
            <p className="text-gray-500 text-sm mb-4">
              Retry attempt {retryCount} of {maxRetries}
            </p>
          )}
          
          <div className="space-y-2">
            {import.meta.env.DEV && debugAuthState && (
              <button
                onClick={debugAuthState}
                className="block mx-auto text-xs text-gray-500 hover:text-gray-300 px-3 py-1 border border-gray-600 rounded"
              >
                Debug Auth State
              </button>
            )}
            
            {retryCount < maxRetries && (
              <button
                onClick={() => {
                  setRetryCount(prev => prev + 1);
                  window.location.reload();
                }}
                className="block mx-auto text-sm text-red-400 hover:text-red-300 px-4 py-2 border border-red-600 rounded hover:bg-red-900/20 transition-colors"
              >
                Retry Authentication
              </button>
            )}
            
            {retryCount >= maxRetries && (
              <div className="space-y-2">
                <p className="text-red-400 text-sm">Authentication failed after {maxRetries} attempts</p>
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/';
                  }}
                  className="block mx-auto text-sm text-red-400 hover:text-red-300 px-4 py-2 border border-red-600 rounded hover:bg-red-900/20 transition-colors"
                >
                  Clear Storage & Go Home
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Redirect if no user
  if (!user || !session) {
    if (import.meta.env.DEV) {
      console.log("[PrivateRoute] No user/session found, redirecting to home");
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/signup" element={<SignUpForm />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route path="/success" element={<Success />} />
      {/* Add catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
      {/* Tempo routes if enabled */}
      {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PowerliftingProvider>
            <Suspense
              fallback={
                <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">
                      Loading Meet Prep Tracker...
                    </p>
                  </div>
                </div>
              }
            >
              <AppRoutes />
            </Suspense>
            <Toaster />
            <OfflineIndicator />
            <PWAInstallPrompt />
          </PowerliftingProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;


