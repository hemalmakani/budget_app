"use client";

import { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FixedCost } from "@/types/type";
import { useBudgetStore } from "@/store/index";
import { router } from "expo-router";
import { formatCurrency } from "@/lib/utils";

interface FixedCostCardProps {
  fixedCost: FixedCost;
  onDelete: (id: string) => Promise<void>;
}

const FixedCostCard = ({ fixedCost, onDelete }: FixedCostCardProps) => {
  const { budgets } = useBudgetStore();
  const [isDeleting, setIsDeleting] = useState(false);

  // Find the linked budget category if it exists
  const linkedBudget = fixedCost.category_id
    ? budgets.find((b) => b.id === fixedCost.category_id)
    : null;

  // Handle delete confirmation
  const handleDelete = () => {
    if (isDeleting) return;

    Alert.alert(
      "Delete Fixed Cost",
      `Are you sure you want to delete "${fixedCost.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await onDelete(fixedCost.id);
            } catch (error) {
              console.error("Failed to delete fixed cost:", error);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="bg-white rounded-xl shadow-sm p-3 mb-3">
      <View className="flex-row justify-between items-center mb-1">
        <View className="flex-1 flex-row items-center">
          <Text className="text-base font-bold text-gray-800 mr-2">
            {fixedCost.name}
          </Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(root)/(tabs)/edit-fixed-cost" as any,
                params: { id: fixedCost.id },
              })
            }
            className="p-1.5 mr-1"
            disabled={isDeleting}
          >
            <Ionicons name="pencil" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="p-1.5"
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {linkedBudget && (
        <Text className="text-xs text-gray-500 mb-1">
          Linked to: {linkedBudget.category}
        </Text>
      )}

      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-xs text-gray-500">
          Amount: $
          {typeof fixedCost.amount === "number"
            ? fixedCost.amount.toFixed(2)
            : fixedCost.amount}
          {fixedCost.frequency && ` • ${fixedCost.frequency}`}
          {fixedCost.start_date &&
            ` • Start: ${new Date(fixedCost.start_date).toLocaleDateString()}`}
          {fixedCost.end_date &&
            ` • End: ${new Date(fixedCost.end_date).toLocaleDateString()}`}
        </Text>
      </View>
    </View>
  );
};

export default FixedCostCard;
