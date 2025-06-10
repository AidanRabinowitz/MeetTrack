import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useState,
} from "react";
import {
  PowerliftingState,
  MeetInfo,
  CurrentStats,
  MeetGoals,
  EquipmentItem,
  WeightEntry,
  UserSettings,
  TrainingEntry,
  TrainingFormData,
  TrainingAnalytics,
  ReadinessScore,
  DEFAULT_EQUIPMENT,
} from "../types/powerlifting";
import { supabase } from "../../supabase/supabase";
import { useAuth } from "../../supabase/auth";
import type { Database } from "../types/supabase";

type PowerliftingAction =
  | { type: "SET_MEET_INFO"; payload: MeetInfo }
  | { type: "SET_CURRENT_STATS"; payload: CurrentStats }
  | { type: "SET_MEET_GOALS"; payload: MeetGoals }
  | {
      type: "UPDATE_LIFT_ATTEMPTS";
      payload: { lift: "squat" | "bench" | "deadlift"; attempts: any };
    }
  | { type: "TOGGLE_EQUIPMENT"; payload: string }
  | { type: "ADD_WEIGHT_ENTRY"; payload: WeightEntry }
  | { type: "SET_UNIT_PREFERENCE"; payload: "kg" | "lbs" }
  | { type: "SET_USER_SETTINGS"; payload: UserSettings }
  | { type: "LOAD_STATE"; payload: PowerliftingState };

const initialState: PowerliftingState = {
  meetInfo: {
    meetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    targetWeightClass: 83,
    meetName: "",
    location: "",
  },
  currentStats: {
    weight: 80,
    squatMax: 140,
    benchMax: 100,
    deadliftMax: 180,
  },
  meetGoals: {
    squat: { opener: 125, second: 140, third: 150, confidence: 8 },
    bench: { opener: 90, second: 100, third: 107.5, confidence: 7 },
    deadlift: { opener: 162.5, second: 180, third: 190, confidence: 9 },
  },
  equipmentChecklist: DEFAULT_EQUIPMENT,
  weightHistory: [{ date: new Date().toISOString().split("T")[0], weight: 80 }],
  unitPreference: "kg",
};

function powerliftingReducer(
  state: PowerliftingState,
  action: PowerliftingAction,
): PowerliftingState {
  switch (action.type) {
    case "SET_MEET_INFO":
      return { ...state, meetInfo: action.payload };
    case "SET_CURRENT_STATS":
      return { ...state, currentStats: action.payload };
    case "SET_MEET_GOALS":
      return { ...state, meetGoals: action.payload };
    case "UPDATE_LIFT_ATTEMPTS":
      return {
        ...state,
        meetGoals: {
          ...state.meetGoals,
          [action.payload.lift]: action.payload.attempts,
        },
      };
    case "TOGGLE_EQUIPMENT":
      return {
        ...state,
        equipmentChecklist: state.equipmentChecklist.map((item) =>
          item.id === action.payload
            ? { ...item, checked: !item.checked }
            : item,
        ),
      };
    case "ADD_WEIGHT_ENTRY":
      return {
        ...state,
        weightHistory: [...state.weightHistory, action.payload],
      };
    case "SET_UNIT_PREFERENCE":
      return {
        ...state,
        unitPreference: action.payload,
      };
    case "SET_USER_SETTINGS":
      return {
        ...state,
        userSettings: action.payload,
        unitPreference: action.payload.weight_unit,
      };
    case "LOAD_STATE":
      return action.payload;
    default:
      return state;
  }
}

interface PowerliftingContextType {
  state: PowerliftingState;
  dispatch: React.Dispatch<PowerliftingAction>;
  loading: boolean;
  error: string | null;
  calculateWilks: (
    total: number,
    bodyweight: number,
    gender: "male" | "female",
  ) => number;
  calculateDots: (
    total: number,
    bodyweight: number,
    gender: "male" | "female",
  ) => number;
  getDaysUntilMeet: () => number;
  getProgressPercentage: (lift: "squat" | "bench" | "deadlift") => number;
  refreshData: () => Promise<void>;
  saveCurrentStats: (stats: CurrentStats) => Promise<void>;
  saveMeetGoals: (goals: MeetGoals) => Promise<void>;
  saveMeetInfo: (info: MeetInfo) => Promise<void>;
  addWeightEntry: (entry: WeightEntry) => Promise<void>;
  toggleEquipmentItem: (itemId: string) => Promise<void>;
  updateCurrentWeight: (weight: number) => Promise<void>;
  updateUnitPreference: (unit: "kg" | "lbs") => Promise<void>;
  saveUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  convertWeight: (
    weight: number,
    fromUnit?: "kg" | "lbs",
    toUnit?: "kg" | "lbs",
  ) => number;
  formatWeight: (weight: number, unit?: "kg" | "lbs") => string;
  addTrainingEntry: (entry: TrainingFormData) => Promise<void>;
  getTrainingHistory: (days?: number) => Promise<TrainingEntry[]>;
  getTrainingAnalytics: (days?: number) => Promise<TrainingAnalytics>;
  calculateReadinessScore: () => ReadinessScore;
}

const PowerliftingContext = createContext<PowerliftingContextType | undefined>(
  undefined,
);

export function PowerliftingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(powerliftingReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Debug logging function - no sensitive data
  const debugLog = (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      // Only log non-sensitive information
      if (typeof data === "object" && data !== null) {
        // Filter out sensitive fields
        const sanitizedData = Object.keys(data).reduce((acc, key) => {
          if (!["id", "user_id", "email"].includes(key)) {
            acc[key] = data[key];
          }
          return acc;
        }, {} as any);
        console.log(
          `[PowerliftingContext] ${message}`,
          Object.keys(sanitizedData).length > 0 ? sanitizedData : "",
        );
      } else {
        console.log(`[PowerliftingContext] ${message}`);
      }
    }
  };

  // Error logging function - no sensitive data
  const errorLog = (message: string, error: any) => {
    console.error(
      `[PowerliftingContext] ${message}:`,
      error?.message || "Unknown error",
    );
    setError(message);
  };

  // Fetch user data from Supabase
  const fetchUserData = async () => {
    if (!user?.id) {
      debugLog("No user found, skipping data fetch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      debugLog("Fetching user data...");

      // Fetch user settings
      debugLog("Fetching user settings...");
      const { data: userSettings, error: settingsError } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsError && settingsError.code !== "PGRST116") {
        errorLog("Error fetching user settings", settingsError);
        throw new Error(
          `Failed to fetch user settings: ${settingsError.message}`,
        );
      }
      debugLog("User settings fetched successfully");

      // Initialize default settings if none exist
      let finalUserSettings = userSettings;
      if (!userSettings) {
        debugLog("No user settings found, creating defaults...");
        const defaultSettings: Partial<UserSettings> = {
          user_id: user.id,
          weight_unit: "kg",
          theme: "dark",
          dashboard_start_tab: "dashboard",
        };

        const { data: newSettings, error: createError } = await supabase
          .from("user_settings")
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) {
          errorLog("Error creating default settings", createError);
          // Continue with defaults even if creation fails
          finalUserSettings = defaultSettings as UserSettings;
        } else {
          debugLog("Default settings created successfully");
          finalUserSettings = newSettings;
        }
      }

      // Fetch current stats
      debugLog("Fetching current stats...");
      const { data: currentStatsData, error: statsError } = await supabase
        .from("current_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (statsError && statsError.code !== "PGRST116") {
        errorLog("Error fetching current stats", statsError);
        throw new Error(`Failed to fetch current stats: ${statsError.message}`);
      }
      debugLog("Current stats fetched successfully");

      // Fetch active meet
      debugLog("Fetching active meet...");
      const { data: meetData, error: meetError } = await supabase
        .from("meets")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (meetError && meetError.code !== "PGRST116") {
        errorLog("Error fetching meet data", meetError);
        throw new Error(`Failed to fetch meet data: ${meetError.message}`);
      }
      debugLog("Meet data fetched successfully");

      // Fetch meet goals
      debugLog("Fetching meet goals...");
      const { data: meetGoalsData, error: goalsError } = await supabase
        .from("meet_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("meet_id", meetData?.id || "00000000-0000-0000-0000-000000000000");

      if (goalsError && goalsError.code !== "PGRST116") {
        errorLog("Error fetching meet goals", goalsError);
        throw new Error(`Failed to fetch meet goals: ${goalsError.message}`);
      }
      debugLog("Meet goals fetched successfully");

      // Fetch weight history
      debugLog("Fetching weight history...");
      const { data: weightHistoryData, error: weightError } = await supabase
        .from("weight_history")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30);

      if (weightError && weightError.code !== "PGRST116") {
        errorLog("Error fetching weight history", weightError);
        throw new Error(
          `Failed to fetch weight history: ${weightError.message}`,
        );
      }
      debugLog("Weight history fetched successfully");

      // Fetch equipment checklist
      debugLog("Fetching equipment checklist...");
      const { data: equipmentData, error: equipmentError } = await supabase
        .from("equipment_checklist")
        .select("*")
        .eq("user_id", user.id);

      if (equipmentError && equipmentError.code !== "PGRST116") {
        errorLog("Error fetching equipment checklist", equipmentError);
        throw new Error(
          `Failed to fetch equipment checklist: ${equipmentError.message}`,
        );
      }
      debugLog("Equipment checklist fetched successfully");

      // Initialize default equipment if none exists
      let finalEquipmentData = equipmentData;
      if (!equipmentData || equipmentData.length === 0) {
        debugLog("No equipment found, initializing defaults...");
        try {
          await initializeDefaultEquipment();
          // Refetch equipment after initialization
          const { data: newEquipmentData } = await supabase
            .from("equipment_checklist")
            .select("*")
            .eq("user_id", user.id);
          finalEquipmentData = newEquipmentData;
          debugLog("Default equipment initialized successfully");
        } catch (equipmentInitError) {
          errorLog(
            "Failed to initialize default equipment",
            equipmentInitError,
          );
          // Continue with default equipment from constants
          finalEquipmentData = [];
        }
      }

      // Transform and set data
      const newState: PowerliftingState = {
        meetInfo: meetData
          ? {
              meetDate: new Date(meetData.meet_date),
              targetWeightClass: meetData.target_weight_class,
              meetName: meetData.meet_name || "",
              location: meetData.location || "",
            }
          : initialState.meetInfo,
        currentStats: currentStatsData
          ? {
              weight: currentStatsData.weight,
              squatMax: currentStatsData.squat_max,
              benchMax: currentStatsData.bench_max,
              deadliftMax: currentStatsData.deadlift_max,
            }
          : initialState.currentStats,
        meetGoals: transformMeetGoalsFromDB(meetGoalsData || []),
        equipmentChecklist:
          finalEquipmentData?.length > 0
            ? transformEquipmentFromDB(finalEquipmentData)
            : DEFAULT_EQUIPMENT,
        weightHistory:
          weightHistoryData?.map((entry) => ({
            date: entry.date,
            weight: entry.weight,
          })) || [],
        unitPreference: finalUserSettings?.weight_unit || "kg",
        userSettings: finalUserSettings || undefined,
      };

      debugLog("Successfully fetched and loaded user data");
      dispatch({ type: "LOAD_STATE", payload: newState });
    } catch (err: any) {
      errorLog("Error fetching user data", err);
    } finally {
      setLoading(false);
    }
  };

  // Transform meet goals from database format
  const transformMeetGoalsFromDB = (goalsData: any[]): MeetGoals => {
    const goals: MeetGoals = {
      squat: { opener: 125, second: 140, third: 150, confidence: 8 },
      bench: { opener: 90, second: 100, third: 107.5, confidence: 7 },
      deadlift: { opener: 162.5, second: 180, third: 190, confidence: 9 },
    };

    goalsData.forEach((goal) => {
      if (goal.lift_type in goals) {
        goals[goal.lift_type as keyof MeetGoals] = {
          opener: goal.opener,
          second: goal.second,
          third: goal.third,
          confidence: goal.confidence,
        };
      }
    });

    return goals;
  };

  // Transform equipment from database format
  const transformEquipmentFromDB = (equipmentData: any[]): EquipmentItem[] => {
    return equipmentData.map((item) => ({
      id: item.id,
      name: item.name,
      checked: item.checked,
      category: item.category,
    }));
  };

  // Initialize default equipment for new users
  const initializeDefaultEquipment = async () => {
    if (!user?.id) return;

    try {
      debugLog("Initializing default equipment for new user");
      const equipmentToInsert = DEFAULT_EQUIPMENT.map((item) => ({
        user_id: user.id,
        name: item.name,
        category: item.category,
        checked: false,
        custom_item: false,
      }));

      const { error } = await supabase
        .from("equipment_checklist")
        .insert(equipmentToInsert);

      if (error) {
        throw new Error(`Failed to initialize equipment: ${error.message}`);
      }

      debugLog("Successfully initialized default equipment");
    } catch (err: any) {
      errorLog("Error initializing default equipment", err);
    }
  };

  // Load data when user changes
  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      setLoading(false);
      dispatch({ type: "LOAD_STATE", payload: initialState });
    }
  }, [user]);

  const calculateWilks = (
    total: number,
    bodyweight: number,
    gender: "male" | "female",
  ): number => {
    const coefficients =
      gender === "male"
        ? {
            a: -216.0475144,
            b: 16.2606339,
            c: -0.002388645,
            d: -0.00113732,
            e: 7.01863e-6,
            f: -1.291e-8,
          }
        : {
            a: 594.31747775582,
            b: -27.23842536447,
            c: 0.82112226871,
            d: -0.00930733913,
            e: 4.731582e-5,
            f: -9.054e-8,
          };

    const { a, b, c, d, e, f } = coefficients;
    const coeff =
      500 /
      (a +
        b * bodyweight +
        c * Math.pow(bodyweight, 2) +
        d * Math.pow(bodyweight, 3) +
        e * Math.pow(bodyweight, 4) +
        f * Math.pow(bodyweight, 5));
    return Math.round(total * coeff * 100) / 100;
  };

  const calculateDots = (
    total: number,
    bodyweight: number,
    gender: "male" | "female",
  ): number => {
    // Simplified DOTS calculation
    const coefficient = gender === "male" ? 0.47278 : 0.57094;
    const dots = total * (coefficient / Math.pow(bodyweight, 0.75));
    return Math.round(dots * 100) / 100;
  };

  const getDaysUntilMeet = (): number => {
    const today = new Date();
    const meetDate = new Date(state.meetInfo.meetDate);
    const diffTime = meetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getProgressPercentage = (
    lift: "squat" | "bench" | "deadlift",
  ): number => {
    const currentMax = state.currentStats[
      `${lift}Max` as keyof CurrentStats
    ] as number;
    const goalThird = state.meetGoals[lift].third;
    return Math.min(100, (currentMax / goalThird) * 100);
  };

  // Save current stats to Supabase
  const saveCurrentStats = async (stats: CurrentStats) => {
    if (!user?.id) {
      errorLog("No user found when saving current stats", null);
      return;
    }

    try {
      debugLog("Saving current stats...");

      // First try to update existing record
      const { error: updateError } = await supabase
        .from("current_stats")
        .update({
          weight: stats.weight,
          squat_max: stats.squatMax,
          bench_max: stats.benchMax,
          deadlift_max: stats.deadliftMax,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      // If no record exists, insert a new one
      if (updateError?.code === "PGRST116") {
        // No rows affected
        const { error: insertError } = await supabase
          .from("current_stats")
          .insert({
            user_id: user.id,
            weight: stats.weight,
            squat_max: stats.squatMax,
            bench_max: stats.benchMax,
            deadlift_max: stats.deadliftMax,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }

      debugLog("Successfully saved current stats");
      dispatch({ type: "SET_CURRENT_STATS", payload: stats });
    } catch (err: any) {
      errorLog("Error saving current stats", err);
      throw err; // Re-throw to handle in calling function
    }
  };

  // Save meet goals to Supabase
  const saveMeetGoals = async (goals: MeetGoals) => {
    if (!user?.id) {
      errorLog("No user found when saving meet goals", null);
      return;
    }

    try {
      debugLog("Saving meet goals...");

      // Get active meet ID
      const { data: meetData } = await supabase
        .from("meets")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      const meetId = meetData?.id;
      if (!meetId) {
        throw new Error("No active meet found");
      }

      // Prepare goals data for upsert
      const goalsToUpsert = Object.entries(goals).map(
        ([liftType, attempts]) => ({
          user_id: user.id,
          meet_id: meetId,
          lift_type: liftType,
          opener: attempts.opener,
          second: attempts.second,
          third: attempts.third,
          confidence: attempts.confidence,
        }),
      );

      const { error } = await supabase
        .from("meet_goals")
        .upsert(goalsToUpsert, {
          onConflict: "user_id,meet_id,lift_type",
        });

      if (error) {
        throw new Error(`Failed to save meet goals: ${error.message}`);
      }

      debugLog("Successfully saved meet goals");
      dispatch({ type: "SET_MEET_GOALS", payload: goals });
    } catch (err: any) {
      errorLog("Error saving meet goals", err);
    }
  };

  // Save meet info to Supabase
  const saveMeetInfo = async (info: MeetInfo) => {
    if (!user?.id) {
      errorLog("No user found when saving meet info", null);
      return;
    }

    try {
      debugLog("Saving meet info...");
      const { error } = await supabase.from("meets").upsert({
        user_id: user.id,
        meet_name: info.meetName || "",
        meet_date: info.meetDate.toISOString().split("T")[0],
        location: info.location || "",
        target_weight_class: info.targetWeightClass,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Failed to save meet info: ${error.message}`);
      }

      debugLog("Successfully saved meet info");
      dispatch({ type: "SET_MEET_INFO", payload: info });
    } catch (err: any) {
      errorLog("Error saving meet info", err);
    }
  };

  // Add weight entry to Supabase (using upsert to avoid duplicates)
  const addWeightEntry = async (entry: WeightEntry) => {
    if (!user?.id) {
      errorLog("No user found when adding weight entry", null);
      return;
    }

    try {
      debugLog("Adding/updating weight entry...");
      const { error } = await supabase.from("weight_history").upsert(
        {
          user_id: user.id,
          weight: entry.weight,
          date: entry.date,
        },
        {
          onConflict: "user_id,date",
        },
      );

      if (error) {
        throw new Error(`Failed to add weight entry: ${error.message}`);
      }

      debugLog("Successfully added/updated weight entry");
      dispatch({ type: "ADD_WEIGHT_ENTRY", payload: entry });
    } catch (err: any) {
      errorLog("Error adding weight entry", err);
      throw err; // Re-throw to handle in calling function
    }
  };

  // Toggle equipment item in Supabase
  const toggleEquipmentItem = async (itemId: string) => {
    if (!user?.id) {
      errorLog("No user found when toggling equipment", null);
      return;
    }

    try {
      debugLog("Toggling equipment item...");
      const item = state.equipmentChecklist.find((item) => item.id === itemId);
      if (!item) {
        throw new Error("Equipment item not found");
      }

      const { error } = await supabase
        .from("equipment_checklist")
        .update({ checked: !item.checked })
        .eq("id", itemId)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(`Failed to toggle equipment: ${error.message}`);
      }

      debugLog("Successfully toggled equipment item");
      dispatch({ type: "TOGGLE_EQUIPMENT", payload: itemId });
    } catch (err: any) {
      errorLog("Error toggling equipment item", err);
    }
  };

  // Update just the current weight (for inline editing)
  const updateCurrentWeight = async (weight: number) => {
    if (!user?.id) {
      errorLog("No user found when updating current weight", null);
      return;
    }

    try {
      debugLog("Updating current weight...");

      const updatedStats = {
        ...state.currentStats,
        weight: weight,
      };

      await saveCurrentStats(updatedStats);

      // Also add to weight history using upsert
      await addWeightEntry({
        date: new Date().toISOString().split("T")[0],
        weight: weight,
      });

      debugLog("Successfully updated current weight");
    } catch (err: any) {
      errorLog("Error updating current weight", err);
      throw err;
    }
  };

  // Update unit preference (legacy method - now uses saveUserSettings)
  const updateUnitPreference = async (unit: "kg" | "lbs") => {
    await saveUserSettings({ weight_unit: unit });
  };

  // Save user settings with optimistic updates and visual feedback
  const saveUserSettings = async (settings: Partial<UserSettings>) => {
    if (!user?.id) {
      errorLog("No user found when saving user settings", null);
      return;
    }

    try {
      debugLog("Saving user settings...");

      // Optimistic update for immediate UI feedback
      const currentSettings = state.userSettings || {
        user_id: user.id,
        weight_unit: "kg" as const,
        theme: "dark" as const,
        dashboard_start_tab: "dashboard",
      };

      const updatedSettings = { ...currentSettings, ...settings };
      dispatch({ type: "SET_USER_SETTINGS", payload: updatedSettings });

      // Update in database
      const { data, error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            ...settings,
          },
          {
            onConflict: "user_id",
          },
        )
        .select()
        .single();

      if (error) {
        // Revert optimistic update on error
        dispatch({ type: "SET_USER_SETTINGS", payload: currentSettings });
        throw new Error(`Failed to save user settings: ${error.message}`);
      }

      // Update with server response
      if (data) {
        dispatch({ type: "SET_USER_SETTINGS", payload: data });
      }

      debugLog("Successfully saved user settings");
    } catch (err: any) {
      errorLog("Error saving user settings", err);
      throw err;
    }
  };

  // Convert weight between units
  const convertWeight = (
    weight: number,
    fromUnit?: "kg" | "lbs",
    toUnit?: "kg" | "lbs",
  ): number => {
    const from = fromUnit || "kg";
    const to = toUnit || state.unitPreference;

    if (from === to) return weight;

    if (from === "kg" && to === "lbs") {
      return Math.round(weight * 2.20462 * 100) / 100;
    } else if (from === "lbs" && to === "kg") {
      return Math.round((weight / 2.20462) * 100) / 100;
    }

    return weight;
  };

  // Format weight with unit
  const formatWeight = (weight: number, unit?: "kg" | "lbs"): string => {
    const displayUnit = unit || state.unitPreference;
    const convertedWeight = convertWeight(weight, "kg", displayUnit);
    return `${convertedWeight}${displayUnit}`;
  };

  // Add training entry to Supabase
  const addTrainingEntry = async (entry: TrainingFormData) => {
    if (!user?.id) {
      errorLog("No user found when adding training entry", null);
      return;
    }

    try {
      debugLog("Adding training entry...");
      const { error } = await supabase.from("training_history").insert({
        user_id: user.id,
        lift_type: entry.lift_type,
        training_date: new Date().toISOString().split("T")[0],
        sets: entry.sets,
        reps: entry.reps,
        weight: entry.weight,
        rpe: entry.rpe || null,
      });

      if (error) {
        throw new Error(`Failed to add training entry: ${error.message}`);
      }

      debugLog("Successfully added training entry");
    } catch (err: any) {
      errorLog("Error adding training entry", err);
      throw err;
    }
  };

  // Get training history from Supabase
  const getTrainingHistory = async (
    days: number = 30,
  ): Promise<TrainingEntry[]> => {
    if (!user?.id) {
      errorLog("No user found when fetching training history", null);
      return [];
    }

    try {
      debugLog(`Fetching training history for last ${days} days...`);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("training_history")
        .select("*")
        .eq("user_id", user.id)
        .gte("training_date", startDate.toISOString().split("T")[0])
        .order("training_date", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch training history: ${error.message}`);
      }

      debugLog("Successfully fetched training history");
      return data || [];
    } catch (err: any) {
      errorLog("Error fetching training history", err);
      return [];
    }
  };

  // Get training analytics from Supabase
  const getTrainingAnalytics = async (
    days: number = 90,
  ): Promise<TrainingAnalytics> => {
    if (!user?.id) {
      errorLog("No user found when fetching training analytics", null);
      return {
        volumeProgression: [],
        estimatedMaxProgression: [],
        weeklyVolume: [],
      };
    }

    try {
      debugLog(`Fetching training analytics for last ${days} days...`);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("training_history")
        .select("*")
        .eq("user_id", user.id)
        .gte("training_date", startDate.toISOString().split("T")[0])
        .order("training_date", { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch training analytics: ${error.message}`);
      }

      debugLog("Successfully fetched training analytics data");

      // Process data for analytics
      const entries = data || [];
      const analytics: TrainingAnalytics = {
        volumeProgression: [],
        estimatedMaxProgression: [],
        weeklyVolume: [],
      };

      // Group by date for volume and 1RM progression
      const dateGroups = entries.reduce(
        (acc, entry) => {
          const date = entry.training_date;
          if (!acc[date]) {
            acc[date] = { squat: 0, bench: 0, deadlift: 0 };
          }
          acc[date][entry.lift_type] += entry.volume || 0;
          return acc;
        },
        {} as Record<
          string,
          { squat: number; bench: number; deadlift: number }
        >,
      );

      // Volume progression
      analytics.volumeProgression = Object.entries(dateGroups).map(
        ([date, volumes]) => ({
          date,
          ...volumes,
        }),
      );

      // Estimated 1RM progression (take max per day per lift)
      const maxGroups = entries.reduce(
        (acc, entry) => {
          const date = entry.training_date;
          if (!acc[date]) {
            acc[date] = { squat: 0, bench: 0, deadlift: 0 };
          }
          acc[date][entry.lift_type] = Math.max(
            acc[date][entry.lift_type],
            entry.estimated_1rm || 0,
          );
          return acc;
        },
        {} as Record<
          string,
          { squat: number; bench: number; deadlift: number }
        >,
      );

      analytics.estimatedMaxProgression = Object.entries(maxGroups).map(
        ([date, maxes]) => ({
          date,
          ...maxes,
        }),
      );

      // Weekly volume (group by week)
      const weekGroups = entries.reduce(
        (acc, entry) => {
          const date = new Date(entry.training_date);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split("T")[0];

          if (!acc[weekKey]) {
            acc[weekKey] = { squat: 0, bench: 0, deadlift: 0, total: 0 };
          }
          const volume = entry.volume || 0;
          acc[weekKey][entry.lift_type] += volume;
          acc[weekKey].total += volume;
          return acc;
        },
        {} as Record<
          string,
          { squat: number; bench: number; deadlift: number; total: number }
        >,
      );

      analytics.weeklyVolume = Object.entries(weekGroups).map(
        ([week, volumes]) => ({
          week,
          ...volumes,
        }),
      );

      return analytics;
    } catch (err: any) {
      errorLog("Error fetching training analytics", err);
      return {
        volumeProgression: [],
        estimatedMaxProgression: [],
        weeklyVolume: [],
      };
    }
  };

  // Calculate Competition Readiness Score
  const calculateReadinessScore = (): ReadinessScore => {
    const { currentStats, meetGoals, equipmentChecklist, meetInfo } = state;

    // Lift Progress (70% total - 23.3% each)
    const calculateLiftProgress = (
      lift: "squat" | "bench" | "deadlift",
    ): number => {
      const currentMax = currentStats[
        `${lift}Max` as keyof CurrentStats
      ] as number;
      const goalThird = meetGoals[lift].third;
      const confidence = meetGoals[lift].confidence;

      if (goalThird === 0) return 0;

      const progressRatio = Math.min(currentMax / goalThird, 1.2); // Cap at 120%
      const confidenceRatio = confidence / 10;

      return progressRatio * confidenceRatio * 23.3;
    };

    const squatProgress = calculateLiftProgress("squat");
    const benchProgress = calculateLiftProgress("bench");
    const deadliftProgress = calculateLiftProgress("deadlift");

    // Weight Management (20%)
    const weightDifference = Math.abs(
      currentStats.weight - meetInfo.targetWeightClass,
    );
    let weightScore = 20;

    if (weightDifference <= 2) {
      weightScore = 20; // 100% if within 2kg
    } else {
      // Linear decrease: lose 2% per kg over 2kg difference
      const excessWeight = weightDifference - 2;
      weightScore = Math.max(0, 20 - excessWeight * 2);
    }

    // Equipment Checklist (10%)
    const completedItems = equipmentChecklist.filter(
      (item) => item.checked,
    ).length;
    const totalItems = equipmentChecklist.length;
    const equipmentScore =
      totalItems > 0 ? (completedItems / totalItems) * 10 : 0;

    const totalScore = Math.min(
      100,
      Math.max(
        0,
        squatProgress +
          benchProgress +
          deadliftProgress +
          weightScore +
          equipmentScore,
      ),
    );

    return {
      total: Math.round(totalScore * 100) / 100,
      breakdown: {
        squatProgress: Math.round(squatProgress * 100) / 100,
        benchProgress: Math.round(benchProgress * 100) / 100,
        deadliftProgress: Math.round(deadliftProgress * 100) / 100,
        weightManagement: Math.round(weightScore * 100) / 100,
        equipmentCompletion: Math.round(equipmentScore * 100) / 100,
      },
    };
  };

  // Refresh all data
  const refreshData = async () => {
    await fetchUserData();
  };

  return (
    <PowerliftingContext.Provider
      value={{
        state,
        dispatch,
        loading,
        error,
        calculateWilks,
        calculateDots,
        getDaysUntilMeet,
        getProgressPercentage,
        refreshData,
        saveCurrentStats,
        saveMeetGoals,
        saveMeetInfo,
        addWeightEntry,
        toggleEquipmentItem,
        updateCurrentWeight,
        updateUnitPreference,
        saveUserSettings,
        convertWeight,
        formatWeight,
        addTrainingEntry,
        getTrainingHistory,
        getTrainingAnalytics,
        calculateReadinessScore,
      }}
    >
      {children}
    </PowerliftingContext.Provider>
  );
}

export function usePowerlifting() {
  const context = useContext(PowerliftingContext);
  if (context === undefined) {
    throw new Error(
      "usePowerlifting must be used within a PowerliftingProvider",
    );
  }
  return context;
}
