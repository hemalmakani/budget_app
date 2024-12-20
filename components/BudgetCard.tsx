import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Budget } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
    Alert.alert(
      "Delete Budget",
      `Are you sure you want to delete the budget category "${budget.category}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await onDelete(budget.id);
            } catch (error) {
              console.error("Error deleting budget:", error);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {};

  return (
    <View className="bg-white rounded-lg p-2 m-2 shadow-inner">
      <View className="absolute top-2 right-2 flex-row z-10">
        <TouchableOpacity
          className="bg-blue-500 rounded-md p-1 mr-2"
          onPress={handleEdit}
          accessibilityLabel={`Edit ${budget.category} budget`}
        >
          <Ionicons name="pencil-outline" size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          className=" bg-red-500 rounded-md p-1 z-10"
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>
      <Text className="text-lg font-bold mb-1">{budget.category}</Text>
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-sm font-semibold">
          {budget.type === "savings" ? "Amount saved:" : "Remaining:"}
        </Text>
        <Text className="text-xl font-bold text-green-600">
          ${Number(budget.balance).toFixed(2)}
        </Text>
      </View>
      <View className="h-1.5 bg-gray-200 rounded-full mb-1">
        <View
          className="h-full bg-green-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>
      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-gray-500">
          {budget.type.charAt(0).toUpperCase() + budget.type.slice(1)}{" "}
          {budget.type === "savings" ? "Goal: $" : "budget: $"}
          {Number(budget.budget).toFixed(2)}
        </Text>
        <Text className="text-xs text-gray-500 text-right">
          ${Number(budget.balance).toFixed(2)} / $
          {Number(budget.budget).toFixed(2)}
        </Text>
      </View>
    </View>
  );
};

export default BudgetCard;
