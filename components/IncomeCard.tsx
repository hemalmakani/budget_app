import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Income {
  id: string;
  source_name: string;
  amount: number;
  received_on: string;
  recurring: boolean;
  frequency: string;
  created_at: string;
}

interface IncomeCardProps {
  income: Income;
  onDelete?: (income_id: string) => void;
}

const IncomeCard: React.FC<IncomeCardProps> = ({ income, onDelete }) => {
  const handleDelete = () => {
    if (!onDelete) return;

    Alert.alert(
      "Delete Income",
      `Delete "${income.source_name}" income entry?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(income.id),
        },
      ]
    );
  };

  // Format date to be more compact
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  // Safely format amount similar to how TransactionCard does it
  const formatAmount = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) {
      return "0.00";
    }
    return Math.abs(numAmount).toFixed(2);
  };

  return (
    <View className="bg-white rounded-lg p-2 mb-1.5 shadow-sm flex-row justify-between items-center">
      <View className="flex-1 mr-2">
        <View className="flex-row items-center">
          <Text
            className="text-sm font-semibold text-gray-900 mr-1.5"
            numberOfLines={1}
          >
            {income.source_name}
          </Text>
          <View className="px-1 py-0.5 rounded-full bg-green-100">
            <Text className="text-xs text-green-600">Income</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <Text className="text-xs text-gray-600 mr-2" numberOfLines={1}>
            {income.recurring ? `${income.frequency} recurring` : "One-time"}
          </Text>
          <Text className="text-xs text-gray-500">
            {formatDate(income.received_on)}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center">
        <Text className="text-base font-bold mr-2 text-green-500">
          +${formatAmount(income.amount)}
        </Text>
        {onDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default IncomeCard;
