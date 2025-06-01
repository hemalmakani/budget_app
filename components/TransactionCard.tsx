import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Transaction } from "@/types/type";

interface TransactionCardProps {
  transaction: Transaction & {
    source?: "manual" | "plaid";
    type?: "income" | "expense";
  };
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

  // Get transaction type - default to "expense" if not specified
  const transactionType = transaction.type || "expense";

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
          <View
            className={`px-1 py-0.5 rounded-full ${
              transactionType === "income" ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <Text
              className={`text-xs ${
                transactionType === "income" ? "text-green-600" : "text-red-600"
              }`}
            >
              {transactionType === "income" ? "Income" : "Expense"}
            </Text>
          </View>
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
            transactionType === "income" ? "text-green-500" : "text-red-500"
          }`}
        >
          {transactionType === "income" ? "+" : "-"}$
          {Math.abs(transaction.amount).toFixed(2)}
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
