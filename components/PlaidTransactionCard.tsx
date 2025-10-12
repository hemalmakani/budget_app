import { View, Text } from "react-native";
import type { PlaidTransaction } from "@/types/plaid";

interface PlaidTransactionCardProps {
  transaction: PlaidTransaction;
}

// Helper function to format category ID to readable text
const formatCategoryId = (categoryId?: string | null): string => {
  if (!categoryId) return "Uncategorized";

  return categoryId
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// Helper function to determine if transaction is income or expense
const getTransactionType = (amount: number): "income" | "expense" => {
  return amount < 0 ? "income" : "expense";
};

export default function PlaidTransactionCard({
  transaction,
}: PlaidTransactionCardProps) {
  const displayName = transaction.merchant_name || transaction.name;
  const transactionType = getTransactionType(transaction.amount);
  const formattedCategory = formatCategoryId(transaction.plaid_category_id);

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

          {/* Transaction Type Badge */}
          <View
            className={`px-1 py-0.5 rounded-full mr-1 ${transactionType === "income" ? "bg-green-100" : "bg-red-100"}`}
          >
            <Text
              className={`text-xs ${transactionType === "income" ? "text-green-600" : "text-red-600"}`}
            >
              {transactionType === "income" ? "Income" : "Expense"}
            </Text>
          </View>

          {/* Plaid Badge */}
          <View className="px-1 py-0.5 rounded-full bg-blue-100 mr-1">
            <Text className="text-xs text-blue-600">Plaid</Text>
          </View>

          {/* Pending Badge */}
          {transaction.pending && (
            <View className="px-1 py-0.5 rounded-full bg-yellow-100">
              <Text className="text-xs text-yellow-600">Pending</Text>
            </View>
          )}

          {/* AI Classified Badge */}
          {transaction.classified_category && (
            <View className="px-1 py-0.5 rounded-full bg-purple-100">
              <Text className="text-xs text-purple-600">AI</Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center flex-wrap">
          {/* Show AI classified category prominently if available */}
          {transaction.classified_category ? (
            <>
              <Text
                className="text-xs font-semibold text-purple-700 mr-2"
                numberOfLines={1}
              >
                🤖 {transaction.classified_category}
              </Text>
              <Text className="text-xs text-gray-500 mr-2" numberOfLines={1}>
                (Plaid: {formattedCategory})
              </Text>
            </>
          ) : (
            <Text className="text-xs text-gray-600 mr-2" numberOfLines={1}>
              {formattedCategory}
            </Text>
          )}
          <Text className="text-xs text-gray-500 mr-2">
            {formatDate(transaction.date)}
          </Text>
          {transaction.transaction_type && (
            <Text className="text-xs text-gray-500 capitalize">
              • {transaction.transaction_type}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center">
        <Text
          className={`text-base font-bold ${transactionType === "income" ? "text-green-500" : "text-red-500"}`}
        >
          {transactionType === "income" ? "+" : "-"}
          {transaction.iso_currency_code === "USD" ? "$" : ""}
          {Math.abs(transaction.amount).toFixed(2)}
        </Text>
      </View>
    </View>
  );
}
