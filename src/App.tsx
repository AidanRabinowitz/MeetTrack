import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useRoutes } from "react-router-dom";
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  console.log("PrivateRoute - User:", user?.id, "Loading:", loading);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("No user found, redirecting to home");
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
                    <p className="text-gray-400">Loading Meet Prep Tracker...</p>
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