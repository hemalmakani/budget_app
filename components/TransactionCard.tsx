import React from "react";
import { Text, View, TouchableOpacity, Alert } from "react-native";
import { Transaction } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";

interface TransactionCardProps {
  transaction: Transaction;
  onDelete: (transaction_id: string) => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onDelete,
}) => {
  const handleDelete = () => {
    Alert.alert(
      "Delete Transaction",
      `Delete "${transaction.transaction_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(transaction.transaction_id),
        },
      ]
    );
  };

  const formattedAmount =
    typeof transaction.amount === "number"
      ? transaction.amount.toFixed(2)
      : transaction.amount;

  return (
    <View className="bg-white rounded-lg p-2 mb-2 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <Ionicons name="cash-outline" size={20} color="#3b82f6" />
        <View className="ml-2 flex-1">
          <Text
            className="font-semibold text-sm text-gray-800"
            numberOfLines={1}
          >
            {transaction.transaction_name}
          </Text>
          <Text className="text-xs text-gray-500">
            {new Date(transaction.created_at).toLocaleDateString()} •{" "}
            {transaction.budget_name}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center">
        <Text
          className={`font-bold text-sm ${
            parseFloat(formattedAmount) < 0 ? "text-red-500" : "text-green-500"
          }`}
        >
          ${formattedAmount}
        </Text>
        <TouchableOpacity
          onPress={handleDelete}
          accessibilityLabel="Delete transaction"
          accessibilityRole="button"
          className="ml-2"
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TransactionCard;
