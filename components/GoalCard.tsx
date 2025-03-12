"use client";

import { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Goal } from "@/types/type";
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
  const progress = (() => {
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
  })();

  // Format the progress value
  const progressText = (() => {
    if (goal.goal_type === "AMOUNT") {
      return `${formatCurrency(goal.current_amount)} / ${formatCurrency(goal.target_amount || 0)}`;
    } else if (goal.goal_type === "PERCENTAGE" && linkedBudget) {
      const savedPercentage =
        (linkedBudget.balance / linkedBudget.budget) * 100;
      return `${savedPercentage.toFixed(1)}% / ${goal.target_percentage}%`;
    }
    return "N/A";
  })();

  // Determine status color
  const statusColor = (() => {
    switch (goal.status) {
      case "COMPLETED":
        return "#10B981"; // green
      case "CANCELLED":
        return "#EF4444"; // red
      default:
        return "#3B82F6"; // blue
    }
  })();

  // Handle delete confirmation
  const handleDelete = () => {
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

  return (
    <View className="bg-white rounded-xl shadow-sm p-3 mb-3">
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-1 flex-row items-center">
          <Text className="text-base font-bold text-gray-800 mr-2">
            {goal.goal_name}
          </Text>
          <View
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${statusColor}20` }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: statusColor }}
            >
              {goal.status}
            </Text>
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(root)/(tabs)/edit-goal" as any,
                params: { id: goal.id },
              })
            }
            className="p-1.5 mr-1"
            disabled={isDeleting}
          >
            <Ionicons name="pencil" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="p-1.5"
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {linkedBudget && (
        <Text className="text-xs text-gray-500 mb-1">
          Linked to: {linkedBudget.category}
        </Text>
      )}

      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-xs text-gray-500">
          {progressText}
          {goal.target_date &&
            ` • Due: ${new Date(goal.target_date).toLocaleDateString()}`}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <View
          className="h-full"
          style={{ width: `${progress}%`, backgroundColor: statusColor }}
        />
      </View>
    </View>
  );
};

export default GoalCard;
