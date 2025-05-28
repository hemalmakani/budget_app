import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Budget } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const BudgetCard = ({
  budget,
  onDelete,
}: {
  budget: Budget;
  onDelete: (id: string) => void;
}) => {
  const router = useRouter();
  const balance = Number(budget.balance);
  const budgetAmount = Number(budget.budget);
  const rawProgress = (balance / budgetAmount) * 100;

  // Handle progress bar logic based on budget type and balance
  const getProgressWidth = () => {
    if (budget.type === "savings") {
      // For savings: cap at 100% when balance exceeds target
      return Math.min(rawProgress, 100);
    } else {
      // For budget categories: show 0% when negative, normal progress when positive
      return Math.max(0, Math.min(rawProgress, 100));
    }
  };

  // Handle balance text color based on budget type and balance
  const getBalanceTextColor = () => {
    if (budget.type === "savings") {
      // Savings are always positive/green
      return "text-green-600";
    } else {
      // Budget categories: red when negative, green when positive
      return balance < 0 ? "text-red-600" : "text-green-600";
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Budget", `Delete "${budget.category}" budget?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(budget.id),
      },
    ]);
  };

  const handleEdit = () => {
    router.push(`/edit-budget?id=${budget.id}`);
  };

  const formatNumber = (num: number) => {
    return num >= 1000 ? (num / 1000).toFixed(1) + "k" : num.toFixed(0);
  };

  const getBudgetTypeText = (type: string) => {
    switch (type) {
      case "monthly":
        return "Monthly";
      case "weekly":
        return "Weekly";
      case "savings":
        return "Savings";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <View className="bg-white rounded-lg p-2 m-1 shadow-sm w-[48%]">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-sm font-bold" numberOfLines={1}>
          {budget.category}
        </Text>
        <View className="flex-row">
          <TouchableOpacity
            className="bg-[#2563eb] p-1 mr-1 rounded-md"
            onPress={handleEdit}
            accessibilityLabel={`Edit ${budget.category} budget`}
          >
            <Ionicons name="pencil" size={12} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-500 p-1 rounded-md"
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={12} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      <Text className={`text-lg font-bold ${getBalanceTextColor()}`}>
        ${formatNumber(balance)}
      </Text>
      <View className="h-1 bg-gray-200 rounded-full my-1">
        <View
          className="h-full bg-green-500 rounded-full"
          style={{ width: `${getProgressWidth()}%` }}
        />
      </View>
      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-gray-500">
          ${formatNumber(balance)} / ${formatNumber(budgetAmount)}
        </Text>
        <Text className="text-xs text-gray-500 italic">
          {getBudgetTypeText(budget.type)}
        </Text>
      </View>
    </View>
  );
};

export default BudgetCard;
