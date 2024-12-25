import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const TransactionItem = ({ transaction, handleDelete }) => {
  return (
    <View className="bg-gray-100 rounded-lg p-3 mb-2 shadow-sm">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 mr-2">
          <Text className="text-base font-semibold text-gray-800">
            {transaction.transaction_name}
          </Text>
          <Text className="text-xs text-gray-500">
            {transaction.budget_name}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className={`text-base font-bold ${
              transaction.amount < 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            ${Math.abs(transaction.amount).toFixed(2)}
          </Text>
          {transaction.source === "manual" && (
            <TouchableOpacity
              onPress={handleDelete}
              className="mt-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View className="flex-row items-center justify-between mt-1">
        <Text className="text-xs text-gray-400">
          {new Date(transaction.created_at).toLocaleDateString()}
        </Text>
        {transaction.source && (
          <View
            className={`px-1.5 py-0.5 rounded-full ${
              transaction.source === "plaid" ? "bg-blue-100" : "bg-gray-200"
            }`}
          >
            <Text
              className={`text-xs ${
                transaction.source === "plaid"
                  ? "text-blue-600"
                  : "text-gray-600"
              }`}
            >
              {transaction.source === "plaid" ? "Bank" : "Manual"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default TransactionItem;
