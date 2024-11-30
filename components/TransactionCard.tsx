import { Text, View, TouchableOpacity, Alert } from "react-native";
import React from "react";
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
      `Are you sure you want to delete "${transaction.transaction_name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            console.log(
              "Attempting to delete transaction:",
              transaction.transaction_id
            );
            onDelete(transaction.transaction_id);
          },
        },
      ]
    );
  };

  const formattedAmount =
    typeof transaction.amount === "number"
      ? transaction.amount.toFixed(2)
      : transaction.amount;

  const formattedDate = new Date(transaction.created_at).toLocaleDateString();

  return (
    <View className="bg-white rounded-lg p-4 mb-4 shadow-inner">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="bg-blue-100 rounded-full p-2 mr-3">
            <Ionicons name="cash-outline" size={24} color="#3b82f6" />
          </View>
          <View>
            <Text className="font-semibold text-base text-gray-800">
              {transaction.transaction_name}
            </Text>
            <Text className="text-sm text-gray-500">{formattedDate}</Text>
          </View>
        </View>
        <Text
          className={`font-bold text-base ${
            parseFloat(formattedAmount) < 0 ? "text-red-500" : "text-green-500"
          }`}
        >
          ${formattedAmount}
        </Text>
      </View>
      <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-200">
        <View className="bg-gray-100 px-2 py-1 rounded">
          <Text className="text-xs text-gray-600">
            {transaction.budget_name}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDelete}
          accessibilityLabel="Delete transaction"
          accessibilityRole="button"
          className="p-2"
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TransactionCard;
