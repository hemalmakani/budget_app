import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Transaction } from "@/types/type";

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
      `Delete "${transaction.transaction_name}" transaction?`,
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

  // Format date to be more compact
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <View className="bg-white rounded-lg p-2 mb-1.5 shadow-sm flex-row justify-between items-center">
      <View className="flex-1 mr-2">
        <View className="flex-row items-center">
          <Text
            className="text-sm font-semibold text-gray-900 mr-1.5"
            numberOfLines={1}
          >
            {transaction.transaction_name}
          </Text>
          {transaction.source && (
            <View
              className={`px-1 py-0.5 rounded-full ${
                transaction.source === "plaid" ? "bg-blue-100" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-xs ${transaction.source === "plaid" ? "text-blue-600" : "text-gray-600"}`}
              >
                {transaction.source === "plaid" ? "Bank" : "Manual"}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center">
          <Text className="text-xs text-gray-600 mr-2" numberOfLines={1}>
            {transaction.budget_name}
          </Text>
          <Text className="text-xs text-gray-500">
            {formatDate(transaction.created_at)}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center">
        <Text
          className={`text-base font-bold mr-2 ${
            transaction.amount < 0 ? "text-red-500" : "text-green-500"
          }`}
        >
          ${Math.abs(transaction.amount).toFixed(2)}
        </Text>
        {transaction.source === "manual" && (
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

export default TransactionCard;
