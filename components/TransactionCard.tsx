import { Text, View, TouchableOpacity, Alert } from "react-native";
import React from "react";
import { Transaction } from "@types/type";
import { Ionicons } from "@expo/vector-icons";

const TransactionCard = ({
  transaction,
  onDelete,
}: {
  transaction: Transaction;
  onDelete: (transaction_id: string) => void;
}) => {
  const handleDelete = () => {
    console.log(transaction.transaction_id);
    Alert.alert(
      "Delete Budget",
      `Are you sure you want to delete the budget category "${transaction.transaction_name}"?`,
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
  return (
    <View className="bg-white rounded-lg p-3 m-2 shadow-md flex-row justify-between items-center">
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-800 mb-1">
          {transaction.transaction_name}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-sm text-gray-500 mr-2">
            {transaction.budget_name}
          </Text>
          <Text className="text-sm font-medium text-red-600">
            ${transaction.amount}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={handleDelete} className="ml-4">
        <Ionicons name="trash-outline" size={20} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
};

export default TransactionCard;
