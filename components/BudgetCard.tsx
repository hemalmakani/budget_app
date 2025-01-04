import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Budget } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";

const BudgetCard = ({
  budget,
  onDelete,
}: {
  budget: Budget;
  onDelete: (id: string) => void;
}) => {
  const progress =
    (parseFloat(budget.balance) / parseFloat(budget.budget)) * 100;

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
            className="bg-blue-500 p-1 mr-1 rounded-md"
            onPress={() => {}} // Placeholder for edit functionality
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
      <Text className="text-lg font-bold text-green-600">
        ${formatNumber(Number(budget.balance))}
      </Text>
      <View className="h-1 bg-gray-200 rounded-full my-1">
        <View
          className="h-full bg-green-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>
      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-gray-500">
          ${formatNumber(Number(budget.balance))} / $
          {formatNumber(Number(budget.budget))}
        </Text>
        <Text className="text-xs text-gray-500 italic">
          {getBudgetTypeText(budget.type)}
        </Text>
      </View>
    </View>
  );
};

export default BudgetCard;
