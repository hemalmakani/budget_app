"use client";

import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import type { PlaidTransaction } from "@/types/plaid";
import { useState, useRef, useEffect } from "react";
import { useBudgetStore } from "@/store";

interface PlaidTransactionCardProps {
  transaction: PlaidTransaction;
  onApprove?: (transactionId: string) => Promise<void>;
  onEdit?: (
    transactionId: string,
    newName: string,
    newCategory: string
  ) => void;
  showActions?: boolean;
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
  onApprove,
  onEdit,
  showActions = false,
}: PlaidTransactionCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [editedName, setEditedName] = useState(
    transaction.editable_name || transaction.merchant_name || transaction.name
  );
  const [editedCategory, setEditedCategory] = useState(
    transaction.editable_category || transaction.classified_category || ""
  );
  const budgets = useBudgetStore((state) => state.budgets);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showCategoryPicker ? -screenWidth : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCategoryPicker, screenWidth, slideAnim]);

  const displayName =
    transaction.editable_name || transaction.merchant_name || transaction.name;
  const displayCategory =
    transaction.editable_category || transaction.classified_category;
  const transactionType = getTransactionType(transaction.amount);
  const formattedCategory = formatCategoryId(transaction.plaid_category_id);
  const isExpense = transaction.amount > 0;

  const handleCloseModal = () => {
    setShowEditModal(false);
    setShowCategoryPicker(false);
    // Reset to original values
    setEditedName(
      transaction.editable_name || transaction.merchant_name || transaction.name
    );
    setEditedCategory(
      transaction.editable_category || transaction.classified_category || ""
    );
  };

  const handleSaveEdit = () => {
    if (!editedName.trim()) {
      Alert.alert("Error", "Transaction name cannot be empty");
      return;
    }
    if (!editedCategory) {
      Alert.alert("Error", "Please select a category");
      return;
    }
    if (onEdit) {
      onEdit(transaction.id, editedName, editedCategory);
    }
    handleCloseModal();
  };

  if (!showActions) {
    // Simple display mode (original behavior)
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

  // Editable mode with actions
  return (
    <>
      <View className="bg-white rounded-lg p-3 mb-2 shadow-sm">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-2">
            <Text className="text-base font-semibold text-gray-900">
              {displayName}
            </Text>
            <Text className="text-sm text-gray-600 mb-1">
              {new Date(transaction.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>

            {displayCategory && (
              <View className="flex-row items-center mt-1">
                <Text className="text-sm text-blue-700 font-semibold">
                  📂 {displayCategory}
                </Text>
                {transaction.editable_name && (
                  <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded-full">
                    <Text className="text-xs text-blue-700">Edited</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View className="items-end">
            <Text
              className={`text-lg font-bold ${isExpense ? "text-red-500" : "text-green-500"}`}
            >
              {isExpense ? "-" : "+"}${Math.abs(transaction.amount).toFixed(2)}
            </Text>

            <View className="flex-row mt-2" style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  console.log(
                    "Edit button pressed for transaction:",
                    transaction.id
                  );
                  setShowEditModal(true);
                }}
                disabled={isApproving}
                className={`bg-blue-500 rounded-lg px-3 py-2 ${isApproving ? "opacity-50" : ""}`}
              >
                <Text className="text-white text-xs font-semibold">
                  ✏️ Edit
                </Text>
              </TouchableOpacity>

              {displayCategory && onApprove && (
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
              )}
            </View>
          </View>
        </View>
      </View>

      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl overflow-hidden max-h-[80%]">
            <Animated.View
              style={{
                flexDirection: "row",
                width: screenWidth * 2,
                transform: [{ translateX: slideAnim }],
              }}
            >
              {/* Edit View */}
              <View style={{ width: screenWidth }} className="p-6">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-xl font-bold text-gray-900">
                    Edit Transaction
                  </Text>
                  <TouchableOpacity
                    onPress={handleCloseModal}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text className="text-gray-500 text-2xl">×</Text>
                  </TouchableOpacity>
                </View>

                {/* Transaction Name */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Transaction Name
                  </Text>
                  <TextInput
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter transaction name"
                    className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900"
                  />
                </View>

                {/* Category */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      console.log("Opening category picker");
                      setShowCategoryPicker(true);
                    }}
                    className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
                  >
                    <Text
                      className={
                        editedCategory ? "text-gray-900" : "text-gray-500"
                      }
                    >
                      {editedCategory || "Select a category"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  className="bg-blue-600 rounded-xl px-4 py-3 mb-4"
                >
                  <Text className="text-white font-semibold text-center">
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Category Picker View */}
              <View style={{ width: screenWidth }} className="p-6">
                <View className="flex-row justify-between items-center mb-4">
                  <TouchableOpacity
                    onPress={() => setShowCategoryPicker(false)}
                    className="flex-row items-center"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text className="text-blue-600 text-lg mr-2">←</Text>
                    <Text className="text-xl font-bold text-gray-900">
                      Select Category
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCloseModal}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text className="text-gray-500 text-2xl">×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {budgets.map((budget) => (
                    <TouchableOpacity
                      key={budget.id}
                      onPress={() => {
                        setEditedCategory(budget.category);
                        setShowCategoryPicker(false);
                      }}
                      activeOpacity={0.7}
                      className={`py-4 px-4 rounded-xl mb-2 ${
                        editedCategory === budget.category
                          ? "bg-blue-100 border-2 border-blue-500"
                          : "bg-gray-50"
                      }`}
                    >
                      <View className="flex-row justify-between items-center">
                        <View>
                          <Text className="text-base font-semibold text-gray-900">
                            {budget.category}
                          </Text>
                          <Text className="text-sm text-gray-600">
                            Balance: ${(Number(budget.balance) || 0).toFixed(2)}{" "}
                            / ${(Number(budget.budget) || 0).toFixed(2)}
                          </Text>
                        </View>
                        {editedCategory === budget.category && (
                          <Text className="text-blue-600 text-lg">✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </>
  );
}
