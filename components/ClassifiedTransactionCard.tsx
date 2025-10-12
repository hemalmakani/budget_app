import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import type { PlaidTransaction } from "@/types/plaid";
import { useState } from "react";
import { useBudgetStore } from "@/store";

interface ClassifiedTransactionCardProps {
  transaction: PlaidTransaction;
  onApprove: (transactionId: string) => Promise<void>;
  onEdit: (transactionId: string, newCategory: string) => void;
}

export default function ClassifiedTransactionCard({
  transaction,
  onApprove,
  onEdit,
}: ClassifiedTransactionCardProps) {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const budgets = useBudgetStore((state) => state.budgets);

  const displayCategory =
    transaction.editable_category || transaction.classified_category;
  const merchantName = transaction.merchant_name || transaction.name;
  const isExpense = transaction.amount > 0;

  return (
    <>
      <View className="bg-white rounded-lg p-3 mb-2 shadow-sm">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-2">
            <Text className="text-base font-semibold text-gray-900">
              {merchantName}
            </Text>
            <Text className="text-sm text-gray-600 mb-1">
              {new Date(transaction.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>

            <View className="flex-row items-center mt-1">
              <Text className="text-sm text-purple-700 font-semibold">
                🤖 {displayCategory}
              </Text>
              {transaction.editable_category && (
                <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded-full">
                  <Text className="text-xs text-blue-700">Edited</Text>
                </View>
              )}
            </View>
          </View>

          <View className="items-end">
            <Text
              className={`text-lg font-bold ${isExpense ? "text-red-500" : "text-green-500"}`}
            >
              {isExpense ? "-" : "+"}${Math.abs(transaction.amount).toFixed(2)}
            </Text>

            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(true)}
                disabled={isApproving}
                className={`bg-blue-500 rounded-lg px-3 py-2 ${isApproving ? "opacity-50" : ""}`}
              >
                <Text className="text-white text-xs font-semibold">
                  ✏️ Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (isApproving) return;
                  setIsApproving(true);
                  try {
                    await onApprove(transaction.id);
                  } catch (error) {
                    console.error("Error in onApprove:", error);
                  } finally {
                    setIsApproving(false);
                  }
                }}
                disabled={isApproving}
                className={`bg-green-500 rounded-lg px-3 py-2 ${isApproving ? "opacity-50" : ""}`}
              >
                <Text className="text-white text-xs font-semibold">
                  {isApproving ? "..." : "✓ Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[70%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900">
                Select Category
              </Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Text className="text-gray-500 text-2xl">×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {budgets.map((budget) => (
                <TouchableOpacity
                  key={budget.id}
                  onPress={() => {
                    onEdit(transaction.id, budget.category);
                    setShowCategoryPicker(false);
                  }}
                  className={`py-4 px-4 rounded-xl mb-2 ${
                    displayCategory === budget.category
                      ? "bg-purple-100 border-2 border-purple-500"
                      : "bg-gray-50"
                  }`}
                >
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-base font-semibold text-gray-900">
                        {budget.category}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Balance: ${(Number(budget.balance) || 0).toFixed(2)} / $
                        {(Number(budget.budget) || 0).toFixed(2)}
                      </Text>
                    </View>
                    {displayCategory === budget.category && (
                      <Text className="text-purple-600 text-lg">✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
