import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Scale,
  TrendingDown,
  Target,
  Calendar,
  Plus,
  Edit,
  Settings,
} from "lucide-react";
import { usePowerlifting } from "../../contexts/PowerliftingContext";
import { WEIGHT_CLASSES } from "../../types/powerlifting";
import { toast } from "@/components/ui/use-toast";

export default function WeightManagement() {
  const {
    state,
    loading,
    error,
    getDaysUntilMeet,
    addWeightEntry,
    saveMeetInfo,
    saveCurrentStats,
  } = usePowerlifting();
  const [newWeight, setNewWeight] = useState("");
  const [selectedWeightClass, setSelectedWeightClass] = useState(
    state.meetInfo.targetWeightClass.toString(),
  );
  const [saving, setSaving] = useState(false);

  // Edit states for inline editing
  const [editingWeight, setEditingWeight] = useState(false);
  const [editingTargetClass, setEditingTargetClass] = useState(false);
  const [tempWeight, setTempWeight] = useState("");
  const [tempTargetClass, setTempTargetClass] = useState("");

  // Meet details modal state
  const [meetDetailsOpen, setMeetDetailsOpen] = useState(false);
  const [meetForm, setMeetForm] = useState({
    meetName: state.meetInfo.meetName || "",
    meetDate: state.meetInfo.meetDate.toISOString().split("T")[0],
    location: state.meetInfo.location || "",
    targetWeightClass: state.meetInfo.targetWeightClass,
  });

  // Update selected weight class when state changes
  useEffect(() => {
    setSelectedWeightClass(state.meetInfo.targetWeightClass.toString());
    setMeetForm({
      meetName: state.meetInfo.meetName || "",
      meetDate: state.meetInfo.meetDate.toISOString().split("T")[0],
      location: state.meetInfo.location || "",
      targetWeightClass: state.meetInfo.targetWeightClass,
    });
  }, [state.meetInfo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading weight management data...</p>
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
  const currentWeight = state.currentStats.weight;
  const targetWeightClass = state.meetInfo.targetWeightClass;
  const weightDifference = currentWeight - targetWeightClass;
  const dailyWeightLoss =
    weightDifference > 0 ? weightDifference / Math.max(daysUntilMeet, 1) : 0;

  const recentWeights = state.weightHistory.slice(-7).reverse();
  const weightTrend =
    recentWeights.length > 1
      ? recentWeights[0].weight - recentWeights[recentWeights.length - 1].weight
      : 0;

  const handleAddWeightEntry = async () => {
    if (!newWeight || parseFloat(newWeight) <= 0) {
      toast({
        title: "Invalid weight",
        description: "Please enter a valid weight.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const newWeightValue = parseFloat(newWeight);

      // Use updateCurrentWeight which handles both current stats and weight history with upsert
      await updateCurrentWeight(newWeightValue);

      setNewWeight("");
      toast({
        title: "Weight logged!",
        description: `Weight of ${newWeightValue}kg has been recorded.`,
      });
    } catch (error) {
      console.error("Error logging weight:", error);
      toast({
        title: "Error logging weight",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateWeightClass = async () => {
    setSaving(true);
    try {
      const newWeightClass = parseFloat(selectedWeightClass);
      const updatedMeetInfo = {
        ...state.meetInfo,
        targetWeightClass: newWeightClass,
      };
      await saveMeetInfo(updatedMeetInfo);
      toast({
        title: "Weight class updated!",
        description: `Target weight class set to ${newWeightClass}kg.`,
      });
    } catch (error) {
      toast({
        title: "Error updating weight class",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getWeightStatus = () => {
    if (weightDifference <= 0) {
      return { status: "on-track", color: "bg-green-500", text: "On Track" };
    } else if (dailyWeightLoss <= 0.5) {
      return {
        status: "manageable",
        color: "bg-yellow-500",
        text: "Manageable Cut",
      };
    } else {
      return {
        status: "aggressive",
        color: "bg-red-500",
        text: "Aggressive Cut Needed",
      };
    }
  };

  const weightStatus = getWeightStatus();

  // Handle inline weight editing
  const handleWeightEdit = () => {
    setTempWeight(currentWeight.toString());
    setEditingWeight(true);
  };

  const handleWeightSave = async () => {
    if (!tempWeight || parseFloat(tempWeight) <= 0) {
      toast({
        title: "Invalid weight",
        description: "Please enter a valid weight.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const newWeightValue = parseFloat(tempWeight);

      // Use updateCurrentWeight which handles both current stats and weight history
      await updateCurrentWeight(newWeightValue);

      setEditingWeight(false);
      toast({
        title: "Weight updated!",
        description: `Current weight set to ${tempWeight}kg.`,
      });
    } catch (error) {
      console.error("Error updating weight:", error);
      toast({
        title: "Error updating weight",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleWeightCancel = () => {
    setEditingWeight(false);
    setTempWeight("");
  };

  // Handle inline target class editing
  const handleTargetClassEdit = () => {
    setTempTargetClass(targetWeightClass.toString());
    setEditingTargetClass(true);
  };

  const handleTargetClassSave = async () => {
    setSaving(true);
    try {
      const newTargetClass = parseFloat(tempTargetClass);
      const updatedMeetInfo = {
        ...state.meetInfo,
        targetWeightClass: newTargetClass,
      };
      await saveMeetInfo(updatedMeetInfo);
      setEditingTargetClass(false);
      toast({
        title: "Target class updated!",
        description: `Target weight class set to ${newTargetClass}kg.`,
      });
    } catch (error) {
      toast({
        title: "Error updating target class",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTargetClassCancel = () => {
    setEditingTargetClass(false);
    setTempTargetClass("");
  };

  // Handle meet details form
  const handleMeetDetailsSubmit = async () => {
    setSaving(true);
    try {
      const updatedMeetInfo = {
        meetName: meetForm.meetName,
        meetDate: new Date(meetForm.meetDate),
        location: meetForm.location,
        targetWeightClass: meetForm.targetWeightClass,
      };
      await saveMeetInfo(updatedMeetInfo);
      setMeetDetailsOpen(false);
      toast({
        title: "Meet details updated!",
        description: "Your competition information has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error updating meet details",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Weight Management</h1>
            <p className="text-gray-400">
              Track your weight and manage your cut for competition
            </p>
          </div>
          <Dialog open={meetDetailsOpen} onOpenChange={setMeetDetailsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Meet Details
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Competition Details</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Manage your meet information and goals.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="meetName" className="text-gray-300">
                    Meet Name
                  </Label>
                  <Input
                    id="meetName"
                    value={meetForm.meetName}
                    onChange={(e) =>
                      setMeetForm({ ...meetForm, meetName: e.target.value })
                    }
                    placeholder="Enter competition name"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="meetDate" className="text-gray-300">
                    Competition Date
                  </Label>
                  <Input
                    id="meetDate"
                    type="date"
                    value={meetForm.meetDate}
                    onChange={(e) =>
                      setMeetForm({ ...meetForm, meetDate: e.target.value })
                    }
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="location" className="text-gray-300">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={meetForm.location}
                    onChange={(e) =>
                      setMeetForm({ ...meetForm, location: e.target.value })
                    }
                    placeholder="Enter competition location"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Target Weight Class</Label>
                  <Select
                    value={meetForm.targetWeightClass.toString()}
                    onValueChange={(value) =>
                      setMeetForm({
                        ...meetForm,
                        targetWeightClass: parseFloat(value),
                      })
                    }
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {WEIGHT_CLASSES.men.map((weightClass) => (
                        <SelectItem
                          key={weightClass}
                          value={weightClass.toString()}
                          className="text-white"
                        >
                          {weightClass === 120.1
                            ? "120kg+"
                            : `${weightClass}kg`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setMeetDetailsOpen(false)}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMeetDetailsSubmit}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? "Saving..." : "Save Details"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
            onClick={editingWeight ? undefined : handleWeightEdit}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Current Weight
                </CardTitle>
                <div className="flex items-center gap-1">
                  {!editingWeight && <Edit className="h-3 w-3 text-gray-500" />}
                  <Scale className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingWeight ? (
                <div className="space-y-2">
                  <Input
                    value={tempWeight}
                    onChange={(e) => setTempWeight(e.target.value)}
                    type="number"
                    step="0.1"
                    className="bg-gray-700 border-gray-600 text-white text-xl font-bold h-8"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={handleWeightSave}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 h-6 text-xs"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleWeightCancel}
                      className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 h-6 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">
                    {currentWeight}kg
                  </div>
                  <div className="flex items-center mt-1">
                    <TrendingDown
                      className={`h-3 w-3 mr-1 ${weightTrend < 0 ? "text-green-500" : "text-red-500"}`}
                    />
                    <span
                      className={`text-xs ${weightTrend < 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {weightTrend > 0 ? "+" : ""}
                      {weightTrend.toFixed(1)}kg (7 days)
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card
            className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
            onClick={editingTargetClass ? undefined : handleTargetClassEdit}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Target Class
                </CardTitle>
                <div className="flex items-center gap-1">
                  {!editingTargetClass && (
                    <Edit className="h-3 w-3 text-gray-500" />
                  )}
                  <Target className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingTargetClass ? (
                <div className="space-y-2">
                  <Select
                    value={tempTargetClass}
                    onValueChange={setTempTargetClass}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {WEIGHT_CLASSES.men.map((weightClass) => (
                        <SelectItem
                          key={weightClass}
                          value={weightClass.toString()}
                          className="text-white"
                        >
                          {weightClass === 120.1
                            ? "120kg+"
                            : `${weightClass}kg`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={handleTargetClassSave}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 h-6 text-xs"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTargetClassCancel}
                      className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 h-6 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">
                    {targetWeightClass}kg
                  </div>
                  <Badge
                    className={`mt-1 ${weightStatus.color} text-white border-none`}
                  >
                    {weightStatus.text}
                  </Badge>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Weight to Lose
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {weightDifference > 0
                  ? `${weightDifference.toFixed(1)}kg`
                  : "0kg"}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {weightDifference > 0
                  ? `${dailyWeightLoss.toFixed(2)}kg/day`
                  : "No cut needed"}
              </p>
            </CardContent>
          </Card>

          <Card
            className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
            onClick={() => setMeetDetailsOpen(true)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Days Remaining
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Edit className="h-3 w-3 text-gray-500" />
                  <Calendar className="h-4 w-4 text-purple-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {daysUntilMeet}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Until {state.meetInfo.meetName || "competition"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weight Logging */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Log Weight</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="weight" className="text-gray-300">
                    Weight (kg)
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="Enter current weight"
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    step="0.1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleAddWeightEntry}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {saving ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>

              {/* Recent Weights */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">
                  Recent Entries
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentWeights.map((entry, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm bg-gray-700 p-2 rounded"
                    >
                      <span className="text-gray-300">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      <span className="text-white font-medium">
                        {entry.weight}kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weight Class Selection */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Weight Class Target</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">
                  Select Target Weight Class
                </Label>
                <Select
                  value={selectedWeightClass}
                  onValueChange={setSelectedWeightClass}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {WEIGHT_CLASSES.men.map((weightClass) => (
                      <SelectItem
                        key={weightClass}
                        value={weightClass.toString()}
                        className="text-white"
                      >
                        {weightClass === 120.1 ? "120kg+" : `${weightClass}kg`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={updateWeightClass}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {saving ? "Updating..." : "Update Weight Class"}
              </Button>

              {/* Cutting Recommendations */}
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Cutting Recommendations
                </h4>
                {weightDifference <= 0 ? (
                  <p className="text-green-400 text-sm">
                    You're already at or below your target weight class!
                  </p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      To make {targetWeightClass}kg, you need to lose{" "}
                      {weightDifference.toFixed(1)}kg in {daysUntilMeet} days.
                    </p>
                    {dailyWeightLoss <= 0.5 ? (
                      <p className="text-green-400">
                        ✓ This is a manageable cut of{" "}
                        {dailyWeightLoss.toFixed(2)}kg per day.
                      </p>
                    ) : (
                      <p className="text-red-400">
                        ⚠ This requires an aggressive cut of{" "}
                        {dailyWeightLoss.toFixed(2)}kg per day. Consider moving
                        up a weight class.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
