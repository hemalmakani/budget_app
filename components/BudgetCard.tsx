import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Budget } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";

const BudgetCard = ({ budget }: { budget: Budget }) => {
  const [remainingBudget, setRemainingBudget] = useState(budget.balance);
  const [amount, setAmount] = useState("");

  const handleAddExpense = () => {
    const expense = parseFloat(amount);
    if (!isNaN(expense) && expense > 0) {
      setRemainingBudget(Math.max(0, remainingBudget - expense));
      setAmount("");
    }
  };

  const handleAddFunds = () => {
    const funds = parseFloat(amount);
    if (!isNaN(funds) && funds > 0) {
      setRemainingBudget(Math.min(budget.budget, remainingBudget + funds));
      setAmount("");
    }
  };

  const progress = (remainingBudget / budget.budget) * 100;

  return (
    <View className="bg-white rounded-lg p-2 m-2 shadow-md">
      <Text className="text-lg font-bold mb-1">{budget.category} Budget</Text>
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-sm font-semibold">
          {budget.type === "savings" ? "Amount saved:" : "Remaining:"}
        </Text>
        <Text className="text-xl font-bold text-green-600">
          ${remainingBudget.toFixed(2)}
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
          {budget.budget.toFixed(2)}
        </Text>
        <Text className="text-xs text-gray-500 text-right">
          ${remainingBudget.toFixed(2)} / ${budget.budget.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};

export default BudgetCard;
