import React from "react";
import { Text, View, TouchableOpacity, Alert } from "react-native";
import { Transaction } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";

interface TransactionCardProps {
  transaction: Transaction & { source?: "manual" | "plaid" };
  onDelete: (transaction_id: string) => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onDelete,
}) => {
  const handleDelete = () => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => onDelete(transaction.transaction_id),
          style: "destructive",
        },
      ]
    );
  };

  return (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">
            {transaction.transaction_name}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            {transaction.budget_name}
          </Text>
          <View className="flex-row items-center mt-2">
            <Text className="text-xs text-gray-400">
              {new Date(transaction.created_at).toLocaleDateString()}
            </Text>
            {transaction.source && (
              <View
                className={`ml-2 px-2 py-1 rounded ${transaction.source === "plaid" ? "bg-blue-100" : "bg-gray-100"}`}
              >
                <Text
                  className={`text-xs ${transaction.source === "plaid" ? "text-blue-600" : "text-gray-600"}`}
                >
                  {transaction.source === "plaid" ? "Bank" : "Manual"}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View className="flex-row items-center">
          <Text
            className={`text-lg font-semibold ${
              transaction.amount < 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            ${Math.abs(transaction.amount).toFixed(2)}
          </Text>
          {transaction.source === "manual" && (
            <TouchableOpacity
              onPress={handleDelete}
              className="ml-4"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default TransactionCard;
