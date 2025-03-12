import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InputField from "@/components/InputField";
import CustomButton from "@/components/CustomButton";
import { router, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useBudgetStore, useGoalStore } from "@/store/index";
import { Ionicons } from "@expo/vector-icons";
import { ReactNativeModal } from "react-native-modal";
import { Budget, Goal } from "@/types/type";
import { FlatList } from "react-native-gesture-handler";

const EditGoal = () => {
  const { user } = useUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { goals, updateGoal } = useGoalStore();
  const { budgets } = useBudgetStore();

  const [isLoading, setIsLoading] = useState(true);
  const [goalName, setGoalName] = useState("");
  const [goalType, setGoalType] = useState<"PERCENTAGE" | "AMOUNT">(
    "PERCENTAGE"
  );
  const [targetAmount, setTargetAmount] = useState("");
  const [targetPercentage, setTargetPercentage] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Budget | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [status, setStatus] = useState<"ACTIVE" | "COMPLETED" | "CANCELLED">(
    "ACTIVE"
  );

  // Find the goal to edit
  useEffect(() => {
    if (id && goals.length > 0) {
      const goalToEdit = goals.find((g) => g.id === id);
      if (goalToEdit) {
        setGoalName(goalToEdit.goal_name);
        setGoalType(goalToEdit.goal_type as "PERCENTAGE" | "AMOUNT");
        setTargetAmount(goalToEdit.target_amount?.toString() || "");
        setTargetPercentage(goalToEdit.target_percentage?.toString() || "");
        setStatus(goalToEdit.status as "ACTIVE" | "COMPLETED" | "CANCELLED");

        if (goalToEdit.target_date) {
          setTargetDate(new Date(goalToEdit.target_date));
        }

        if (goalToEdit.category_id) {
          const linkedBudget = budgets.find(
            (b) => b.id === goalToEdit.category_id
          );
          if (linkedBudget) {
            setSelectedCategory(linkedBudget);
          }
        }

        setIsLoading(false);
      } else {
        Alert.alert("Error", "Goal not found");
        router.back();
      }
    } else if (goals.length > 0) {
      setIsLoading(false);
    }
  }, [id, goals, budgets]);

  const handleDateChange = (newDate: Date) => {
    setTargetDate(newDate);
    setShowDatePicker(false);
  };

  const handleSubmit = async () => {
    try {
      if (!goalName.trim()) {
        Alert.alert("Error", "Please enter a goal name");
        return;
      }

      if (goalType === "AMOUNT" && !targetAmount) {
        Alert.alert("Error", "Please enter a target amount");
        return;
      }

      if (goalType === "PERCENTAGE" && !targetPercentage) {
        Alert.alert("Error", "Please enter a target percentage");
        return;
      }

      const updatedGoalData = {
        goal_name: goalName,
        goal_type: goalType,
        target_amount: goalType === "AMOUNT" ? parseFloat(targetAmount) : null,
        target_percentage:
          goalType === "PERCENTAGE" ? parseFloat(targetPercentage) : null,
        target_date: targetDate?.toISOString() || null,
        status,
        category_id: selectedCategory?.id || null,
      };

      await updateGoal(id!, updatedGoalData);
      router.back();
    } catch (error) {
      console.error("Failed to update goal:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to update goal. Please try again."
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["bottom", "left", "right"]}
    >
      <ScrollView className="flex-1 p-4">
        <Text className="text-2xl font-bold mb-6">Edit Your Goal</Text>

        <InputField
          label="Goal Name"
          placeholder="Enter your goal name"
          value={goalName}
          onChangeText={setGoalName}
        />

        <View className="my-4">
          <Text className="text-lg font-semibold mb-3">Goal Type</Text>
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={() => setGoalType("PERCENTAGE")}
              className={`flex-1 p-4 rounded-lg border ${
                goalType === "PERCENTAGE"
                  ? "bg-blue-500 border-blue-500"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  goalType === "PERCENTAGE" ? "text-white" : "text-gray-700"
                }`}
              >
                Percentage
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGoalType("AMOUNT")}
              className={`flex-1 p-4 rounded-lg border ${
                goalType === "AMOUNT"
                  ? "bg-blue-500 border-blue-500"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  goalType === "AMOUNT" ? "text-white" : "text-gray-700"
                }`}
              >
                Amount
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="my-4">
          <Text className="text-lg font-semibold mb-3">Status</Text>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => setStatus("ACTIVE")}
              className={`flex-1 p-3 rounded-lg border ${
                status === "ACTIVE"
                  ? "bg-blue-500 border-blue-500"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  status === "ACTIVE" ? "text-white" : "text-gray-700"
                }`}
              >
                Active
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatus("COMPLETED")}
              className={`flex-1 p-3 rounded-lg border ${
                status === "COMPLETED"
                  ? "bg-green-500 border-green-500"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  status === "COMPLETED" ? "text-white" : "text-gray-700"
                }`}
              >
                Completed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setStatus("CANCELLED")}
              className={`flex-1 p-3 rounded-lg border ${
                status === "CANCELLED"
                  ? "bg-red-500 border-red-500"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  status === "CANCELLED" ? "text-white" : "text-gray-700"
                }`}
              >
                Cancelled
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="my-4">
          <Text className="text-lg font-semibold mb-3">
            Link to Category (Optional)
          </Text>
          <TouchableOpacity
            onPress={() => setShowCategoryModal(true)}
            className="p-4 rounded-lg border border-gray-300 flex-row justify-between items-center"
          >
            <Text>
              {selectedCategory
                ? selectedCategory.category
                : "Select a category"}
            </Text>
            <Ionicons name="chevron-up" size={24} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {goalType === "AMOUNT" ? (
          <InputField
            label="Target Amount"
            placeholder="Enter target amount"
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="decimal-pad"
          />
        ) : (
          <InputField
            label="Target Percentage"
            placeholder="Enter target percentage"
            value={targetPercentage}
            onChangeText={setTargetPercentage}
            keyboardType="decimal-pad"
          />
        )}

        <View className="my-4">
          <Text className="text-lg font-semibold mb-3">
            Target Date (Optional
            {goalType === "AMOUNT" ? "" : " for percentage goals"})
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="p-4 rounded-lg border border-gray-300"
          >
            <Text>
              {targetDate ? targetDate.toLocaleDateString() : "Select Date"}
            </Text>
          </TouchableOpacity>
        </View>

        <CustomDatePicker
          isVisible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onDateChange={handleDateChange}
          initialDate={targetDate || new Date()}
        />
      </ScrollView>

      <View className="p-3 mb-14">
        <CustomButton
          title="Update Goal"
          onPress={handleSubmit}
          className="mb-4"
        />
      </View>

      <ReactNativeModal
        isVisible={showCategoryModal}
        onBackdropPress={() => setShowCategoryModal(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
        onBackButtonPress={() => setShowCategoryModal(false)}
      >
        <View className="bg-white rounded-t-3xl p-6 h-2/3 shadow-lg">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-blue-600">
              Select a Category
            </Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={budgets}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(item);
                  setShowCategoryModal(false);
                }}
                className="py-4 border-b border-gray-200"
              >
                <Text className="text-lg text-gray-700">{item.category}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </ReactNativeModal>
    </SafeAreaView>
  );
};

// Reuse the CustomDatePicker component from goal-setup.tsx
interface CustomDatePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onDateChange: (date: Date) => void;
  initialDate: Date;
}

const CustomDatePicker = ({
  isVisible,
  onClose,
  onDateChange,
  initialDate,
}: CustomDatePickerProps) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handleConfirm = () => {
    onDateChange(selectedDate);
    onClose();
  };

  return (
    <ReactNativeModal
      isVisible={isVisible}
      onBackdropPress={onClose}
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View className="bg-white rounded-t-xl p-4">
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-blue-500 font-semibold">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold">Select Date</Text>
          <TouchableOpacity onPress={handleConfirm}>
            <Text className="text-blue-500 font-semibold">Confirm</Text>
          </TouchableOpacity>
        </View>

        {/* Simple date picker - in a real app, use a proper date picker component */}
        <View className="py-4">
          <Text className="text-center text-lg">
            {selectedDate.toLocaleDateString()}
          </Text>
          <View className="flex-row justify-center space-x-4 mt-4">
            <TouchableOpacity
              onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() - 1);
                setSelectedDate(newDate);
              }}
              className="p-2 bg-gray-200 rounded-full"
            >
              <Ionicons name="chevron-back" size={24} color="#4B5563" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + 1);
                setSelectedDate(newDate);
              }}
              className="p-2 bg-gray-200 rounded-full"
            >
              <Ionicons name="chevron-forward" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ReactNativeModal>
  );
};

export default EditGoal;
