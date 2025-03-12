import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Goal } from "@/types/type";
import { useBudgetStore } from "@/store/index";
import { router } from "expo-router";
import { formatCurrency } from "@/lib/utils";

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => Promise<void>;
}

const GoalCard = ({ goal, onDelete }: GoalCardProps) => {
  const { budgets } = useBudgetStore();
  const [isDeleting, setIsDeleting] = useState(false);

  // Find the linked budget category if it exists
  const linkedBudget = goal.category_id
    ? budgets.find((b) => b.id === goal.category_id)
    : null;

  // Calculate progress percentage
  const calculateProgress = () => {
    if (goal.goal_type === "AMOUNT" && goal.target_amount) {
      return Math.min(100, (goal.current_amount / goal.target_amount) * 100);
    } else if (
      goal.goal_type === "PERCENTAGE" &&
      goal.target_percentage &&
      linkedBudget
    ) {
      const savedPercentage =
        (linkedBudget.balance / linkedBudget.budget) * 100;
      return Math.min(100, (savedPercentage / goal.target_percentage) * 100);
    }
    return 0;
  };

  const progress = calculateProgress();

  // Format the target value based on goal type
  const formatTarget = () => {
    if (goal.goal_type === "AMOUNT" && goal.target_amount) {
      return formatCurrency(goal.target_amount);
    } else if (goal.goal_type === "PERCENTAGE" && goal.target_percentage) {
      return `${goal.target_percentage}%`;
    }
    return "N/A";
  };

  // Format the current progress value
  const formatProgress = () => {
    if (goal.goal_type === "AMOUNT") {
      return `${formatCurrency(goal.current_amount)} / ${formatCurrency(goal.target_amount || 0)}`;
    } else if (goal.goal_type === "PERCENTAGE" && linkedBudget) {
      const savedPercentage =
        (linkedBudget.balance / linkedBudget.budget) * 100;
      return `${savedPercentage.toFixed(1)}% / ${goal.target_percentage}%`;
    }
    return "N/A";
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (isDeleting) return;

    Alert.alert(
      "Delete Goal",
      `Are you sure you want to delete "${goal.goal_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await onDelete(goal.id);
            } catch (error) {
              console.error("Failed to delete goal:", error);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Handle edit navigation
  const handleEdit = () => {
    router.push({
      pathname: "/(root)/(tabs)/edit-goal" as any,
      params: { id: goal.id },
    });
  };

  // Determine status color
  const getStatusColor = () => {
    switch (goal.status) {
      case "COMPLETED":
        return "#10B981"; // green
      case "CANCELLED":
        return "#EF4444"; // red
      default:
        return "#3B82F6"; // blue
    }
  };

  return (
    <View className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800">
            {goal.goal_name}
          </Text>
          {linkedBudget && (
            <Text className="text-sm text-gray-500">
              Linked to: {linkedBudget.category}
            </Text>
          )}
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={handleEdit}
            className="p-2 mr-2"
            disabled={isDeleting}
          >
            <Ionicons name="pencil" size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="p-2"
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="mb-2">
        <Text className="text-sm text-gray-500">
          Target: {formatTarget()}
          {goal.target_date &&
            ` by ${new Date(goal.target_date).toLocaleDateString()}`}
        </Text>
        <Text className="text-sm text-gray-500">
          Progress: {formatProgress()}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
        <View
          className="h-full bg-blue-500"
          style={{ width: `${progress}%`, backgroundColor: getStatusColor() }}
        />
      </View>

      {/* Status badge */}
      <View className="flex-row justify-between items-center">
        <View
          className="px-2 py-1 rounded-full"
          style={{ backgroundColor: `${getStatusColor()}20` }}
        >
          <Text
            className="text-xs font-medium"
            style={{ color: getStatusColor() }}
          >
            {goal.status}
          </Text>
        </View>
        <Text className="text-xs text-gray-500">
          Created: {new Date(goal.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};

export default GoalCard;
