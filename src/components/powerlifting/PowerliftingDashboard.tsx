import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Target,
  TrendingUp,
  Clock,
  Dumbbell,
  Scale,
  CheckSquare,
  Plus,
  Settings,
  Edit,
} from "lucide-react";
import { usePowerlifting } from "../../contexts/PowerliftingContext";
import LiftCard from "./LiftCard";
import AnimatedProgressBar from "./AnimatedProgressBar";
import { toast } from "@/components/ui/use-toast";

export default function PowerliftingDashboard() {
  const {
    state,
    loading,
    error,
    getDaysUntilMeet,
    calculateWilks,
    addWeightEntry,
    saveCurrentStats,
    formatWeight,
  } = usePowerlifting();

  const [quickWeightOpen, setQuickWeightOpen] = useState(false);
  const [quickWeight, setQuickWeight] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your powerlifting data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading data: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const daysUntilMeet = getDaysUntilMeet();
  const totalLifts =
    state.currentStats.squatMax +
    state.currentStats.benchMax +
    state.currentStats.deadliftMax;
  const wilksScore = calculateWilks(
    totalLifts,
    state.currentStats.weight,
    "male",
  );
  const completedEquipment = state.equipmentChecklist.filter(
    (item) => item.checked,
  ).length;
  const totalEquipment = state.equipmentChecklist.length;
  const equipmentProgress = (completedEquipment / totalEquipment) * 100;

  // Handle quick weight logging
  const handleQuickWeightLog = async () => {
    if (!quickWeight || parseFloat(quickWeight) <= 0) {
      toast({
        title: "Invalid weight",
        description: "Please enter a valid weight.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const weightValue = parseFloat(quickWeight);

      // Add to weight history
      await addWeightEntry({
        date: new Date().toISOString().split("T")[0],
        weight: weightValue,
      });

      // Update current stats
      await saveCurrentStats({
        ...state.currentStats,
        weight: weightValue,
      });

      setQuickWeight("");
      setQuickWeightOpen(false);
      toast({
        title: "Weight logged!",
        description: `Weight of ${quickWeight}kg has been recorded.`,
      });
    } catch (error) {
      toast({
        title: "Error logging weight",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-3 sm:p-4 md:p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-4 md:space-y-6"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="text-center mb-6 md:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
            Meet Prep Tracker
          </h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg">
            {state.meetInfo.meetName || "Your Next Competition"}
          </p>
        </motion.div>

        {/* Quick Actions Bar */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center gap-2 sm:gap-4 mb-4 md:mb-6"
        >
          <Dialog open={quickWeightOpen} onOpenChange={setQuickWeightOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-sm sm:text-base touch-target">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Log Weight</span>
                <span className="sm:hidden">Weight</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Quick Weight Log</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Log your current weight quickly.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="quickWeight" className="text-gray-300">
                    Weight (kg)
                  </Label>
                  <Input
                    id="quickWeight"
                    type="number"
                    value={quickWeight}
                    onChange={(e) => setQuickWeight(e.target.value)}
                    placeholder="Enter current weight"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    step="0.1"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setQuickWeightOpen(false)}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleQuickWeightLog}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? "Logging..." : "Log Weight"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-8"
        >
          <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                  Days Until Meet
                </CardTitle>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {daysUntilMeet}
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {state.meetInfo.meetName || "Competition"}
              </p>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">
                {new Date(state.meetInfo.meetDate).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                  Current Total
                </CardTitle>
                <Dumbbell className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {formatWeight(totalLifts)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Wilks: {wilksScore}</p>
            </CardContent>
          </Card>

          <Card
            className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer touch-target"
            onClick={() => setQuickWeightOpen(true)}
          >
            <CardHeader className="pb-2 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                  Body Weight
                </CardTitle>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Plus className="h-3 w-3 text-gray-500" />
                  <Scale className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {formatWeight(state.currentStats.weight)}
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate">
                Target: {formatWeight(state.meetInfo.targetWeightClass)} class
              </p>
              <p className="text-xs text-blue-400 mt-1 hidden sm:block">
                Click to log weight
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-400 truncate">
                  Equipment Ready
                </CardTitle>
                <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {completedEquipment}/{totalEquipment}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${equipmentProgress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Lift Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
          <LiftCard
            lift="squat"
            icon={<Target className="h-6 w-6 text-white" />}
            color="bg-red-500"
            bgColor="hover:bg-red-900/20"
          />
          <LiftCard
            lift="bench"
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            color="bg-blue-500"
            bgColor="hover:bg-blue-900/20"
          />
          <LiftCard
            lift="deadlift"
            icon={<Dumbbell className="h-6 w-6 text-white" />}
            color="bg-green-500"
            bgColor="hover:bg-green-900/20"
          />
        </motion.div>

        {/* Progress Summary */}
        <motion.div variants={itemVariants} className="mb-4 md:mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                Competition Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {Math.round(
                      ((state.currentStats.squatMax +
                        state.currentStats.benchMax +
                        state.currentStats.deadliftMax) /
                        (state.meetGoals.squat.third +
                          state.meetGoals.bench.third +
                          state.meetGoals.deadlift.third)) *
                        100,
                    )}
                    %
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Goal Progress
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {Math.round(equipmentProgress)}%
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Equipment Ready
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {state.currentStats.weight <=
                    state.meetInfo.targetWeightClass
                      ? "✓"
                      : "⚠"}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Weight Target
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
