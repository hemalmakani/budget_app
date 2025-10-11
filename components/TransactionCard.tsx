import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Transaction } from "@/types/type";

interface PlaidTransactionType {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  subcategory?: string;
  transaction_type: string;
  pending: boolean;
  transaction_id: string;
  merchant_name?: string;
  account_name?: string;
  account_type?: string;
  created_at: string;
  source: "plaid";
}

interface TransactionCardProps {
  transaction:
    | (Transaction & {
        source?: "manual" | "plaid";
        type?: "income" | "expense";
      })
    | PlaidTransactionType;
  onDelete: (transaction_id: string) => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onDelete,
}) => {
  const isPlaidTransaction = transaction.source === "plaid";

  const handleDelete = () => {
    const name = isPlaidTransaction
      ? (transaction as PlaidTransactionType).name
      : (transaction as Transaction).transaction_name;

    Alert.alert("Delete Transaction", `Delete "${name}" transaction?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          onDelete(
            isPlaidTransaction
              ? (transaction as PlaidTransactionType).transaction_id
              : (transaction as Transaction).transaction_id
          ),
      },
    ]);
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
  // Note: Plaid uses positive amounts for expenses (money leaving account)
  // and negative amounts for income (money entering account)
  const transactionType = isPlaidTransaction
    ? (transaction as PlaidTransactionType).amount > 0
      ? "expense"
      : "income"
    : (transaction as Transaction).type || "expense";

  // Get display name and category
  const displayName = isPlaidTransaction
    ? (transaction as PlaidTransactionType).name
    : (transaction as Transaction).transaction_name;

  const displayCategory = isPlaidTransaction
    ? (transaction as PlaidTransactionType).category
    : (transaction as Transaction).budget_name;

  const displayDate = isPlaidTransaction
    ? (transaction as PlaidTransactionType).date
    : (transaction as Transaction).created_at;

  return (
    <View className="bg-white rounded-lg p-2 mb-1.5 shadow-sm flex-row justify-between items-center">
      <View className="flex-1 mr-2">
        <View className="flex-row items-center flex-wrap">
          <Text
            className="text-sm font-semibold text-gray-900 mr-1.5"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <View
            className={`px-1 py-0.5 rounded-full mr-1 ${
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
          {isPlaidTransaction && (
            <View className="px-1 py-0.5 rounded-full bg-blue-100">
              <Text className="text-xs text-blue-600">Plaid</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center">
          <Text className="text-xs text-gray-600 mr-2" numberOfLines={1}>
            {displayCategory}
          </Text>
          <Text className="text-xs text-gray-500">
            {formatDate(displayDate)}
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
