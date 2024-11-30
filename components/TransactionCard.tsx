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
    <View className="bg-white rounded-lg p-3 m-2 shadow-md flex-row justify-between items-center">
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-800 mb-1">
          {transaction.transaction_name}
        </Text>
        <View className="flex-row items-center justify-between flex-wrap">
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-500 mr-2">
              {transaction.budget_name}
            </Text>
            <Text className="text-sm text-gray-500">{formattedDate}</Text>
          </View>
          <Text className="text-sm font-medium text-red-600">
            ${formattedAmount}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={handleDelete}
        className="ml-4 p-2"
        accessibilityLabel="Delete transaction"
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={20} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
};

export default TransactionCard;
