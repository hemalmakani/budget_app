"use client";

import { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FixedCost } from "@/types/type";
import { useBudgetStore } from "@/store/index";
import { router } from "expo-router";

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

  // Format the date in a more compact way
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <View className="bg-white rounded-xl shadow-sm p-2.5 mb-2">
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-base font-bold text-gray-800 mr-1">
              {fixedCost.name}
            </Text>
            {linkedBudget && (
              <View className="bg-blue-100 rounded-full px-2 py-0.5">
                <Text className="text-xs text-blue-700">
                  {linkedBudget.category}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row flex-wrap items-center mt-0.5">
            <Text className="text-sm font-medium text-gray-700 mr-2">
              $
              {typeof fixedCost.amount === "number"
                ? fixedCost.amount.toFixed(2)
                : fixedCost.amount}
            </Text>

            {fixedCost.frequency && (
              <View className="flex-row items-center mr-2">
                <Ionicons
                  name="repeat"
                  size={12}
                  color="#6B7280"
                  className="mr-0.5"
                />
                <Text className="text-xs text-gray-500">
                  {fixedCost.frequency}
                </Text>
              </View>
            )}

            {fixedCost.start_date && (
              <View className="flex-row items-center mr-2">
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color="#6B7280"
                  className="mr-0.5"
                />
                <Text className="text-xs text-gray-500">
                  {formatDate(fixedCost.start_date)}
                  {fixedCost.end_date && ` - ${formatDate(fixedCost.end_date)}`}
                </Text>
              </View>
            )}
          </View>
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
            <Ionicons name="pencil" size={16} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="p-1.5"
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default FixedCostCard;
