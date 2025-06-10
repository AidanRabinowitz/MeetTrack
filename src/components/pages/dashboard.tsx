import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import TopNavigation from "../dashboard/layout/TopNavigation";
import Sidebar from "../dashboard/layout/Sidebar";
import PowerliftingDashboard from "../powerlifting/PowerliftingDashboard";
import LiftTracker from "../powerlifting/LiftTracker";
import Training from "../powerlifting/Training";
import WeightManagement from "../powerlifting/WeightManagement";
import EquipmentChecklist from "../powerlifting/EquipmentChecklist";
import Analytics from "../powerlifting/Analytics";
import SettingsPage from "./SettingsPage";
import HelpContactForm from "./HelpContactForm";
import {
  PowerliftingProvider,
  usePowerlifting,
} from "../../contexts/PowerliftingContext";

// Loading timeout component
function LoadingTimeoutWrapper({ children }: { children: React.ReactNode }) {
  const { loading, error, refreshData } = usePowerlifting();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowTimeout(true);
      }, 15000); // Show timeout after 15 seconds

      return () => clearTimeout(timer);
    } else {
      setShowTimeout(false);
    }
  }, [loading]);

  if (loading && showTimeout) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Loading is taking longer than expected
          </h2>
          <p className="text-gray-400 mb-6">
            There might be a connection issue. You can try refreshing the data
            or check your internet connection.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                setShowTimeout(false);
                refreshData();
              }}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Loading
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button
            onClick={() => refreshData()}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function DashboardContent() {
  const [activeView, setActiveView] = useState("dashboard");
  const [helpFormOpen, setHelpFormOpen] = useState(false);

  const handleItemClick = (key: string) => {
    if (key === "help" || key === "support") {
      setHelpFormOpen(true);
    } else {
      setActiveView(key);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <PowerliftingDashboard />;
      case "lifts":
        return <LiftTracker />;
      case "training":
        return <Training />;
      case "weight":
        return <WeightManagement />;
      case "equipment":
        return <EquipmentChecklist />;
      case "analytics":
        return <Analytics />;
      case "settings":
        return <SettingsPage onBack={() => setActiveView("dashboard")} />;
      default:
        return <PowerliftingDashboard />;
    }
  };

  return (
    <LoadingTimeoutWrapper>
      <div className="min-h-screen bg-gray-900">
        <TopNavigation onSettingsClick={() => setActiveView("settings")} />

        <div className="flex pt-16 h-screen">
          <div className="w-16 sm:w-auto flex-shrink-0">
            <Sidebar activeItem={activeView} onItemClick={handleItemClick} />
          </div>

          <main className="flex-1 overflow-auto">{renderContent()}</main>
        </div>

        <HelpContactForm open={helpFormOpen} onOpenChange={setHelpFormOpen} />
      </div>
    </LoadingTimeoutWrapper>
  );
}

const Dashboard = () => {
  return (
    <PowerliftingProvider>
      <DashboardContent />
    </PowerliftingProvider>
  );
};

export default Dashboard;
