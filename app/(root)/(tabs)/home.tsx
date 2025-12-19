"use client";

import React, { useState, useEffect } from "react";
import Icon from "react-native-vector-icons/Ionicons";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser, useAuth } from "@clerk/clerk-expo";
import BudgetCard from "@/components/BudgetCard";
import FixedCostCard from "@/components/GoalCard";
import type { Budget, FixedCost } from "@/types/type";
import { router } from "expo-router";
import { useBudgetStore, useFixedCostStore } from "@/store/index";
import CustomButton from "@/components/CustomButton";
import { useDataStore } from "@/store/dataStore";

export default function Page() {
  const userData = useDataStore((state) => state.userData);
  const { user } = useUser();
  const { getToken } = useAuth();
  const { budgets, setBudgets, deleteBudget } = useBudgetStore();
  const { fixedCosts, fetchFixedCosts, deleteFixedCost } = useFixedCostStore();
  const { width } = useWindowDimensions();
  const [numColumns, setNumColumns] = useState(width > 600 ? 3 : 2);
  const isLoading = useDataStore((state) => state.isLoading);
  const hasInitialDataLoaded = useDataStore(
    (state) => state.hasInitialDataLoaded
  );

  useEffect(() => {
    const newNumColumns = width > 600 ? 3 : 2;
    setNumColumns(newNumColumns);
  }, [width]);

  useEffect(() => {
    const loadFixedCosts = async () => {
      if (user?.id) {
        const token = await getToken();
        await fetchFixedCosts(user.id, token);
      }
    };
    loadFixedCosts();
  }, [user?.id]);

  const handleDeleteBudget = async (id: string) => {
    try {
      const token = await getToken();
      await deleteBudget(id, token);
      // Show success feedback since store no longer shows alerts
      Alert.alert("Success", "Budget category deleted successfully!");
    } catch (err) {
      console.error("Delete operation failed:", err);
      // Error is already handled by the store
    }
  };

  const handleDeleteFixedCost = async (id: string) => {
    try {
      const token = await getToken();
      await deleteFixedCost(id, token);
    } catch (err) {
      console.error("Delete fixed cost operation failed:", err);
    }
  };

  const renderBudgetCard = ({ item }: { item: Budget }) => (
    <BudgetCard budget={item} onDelete={handleDeleteBudget} />
  );

  const renderFixedCostCard = ({ item }: { item: FixedCost }) => (
    <FixedCostCard fixedCost={item} onDelete={handleDeleteFixedCost} />
  );

  const keyExtractor = (item: Budget | FixedCost, index: number) =>
    `${item.id}-${index}`;

  if (isLoading && !hasInitialDataLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-lg text-gray-600">Loading your data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-200">
      <ScrollView
        className="flex-1 px-2"
        contentContainerStyle={{ paddingBottom: 120 }} // Add padding to the bottom of the ScrollView
      >
        <View className="flex-row justify-between items-center mb-2 px-2">
          <Text className="text-xl font-bold text-center text-gray-800">
            Welcome, {userData?.name || "User"}
          </Text>
        </View>

        {/* Budget Categories Section */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2 px-2">
            <Text className="text-lg font-semibold text-gray-800">
              Budget Categories
            </Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: "/(root)/(tabs)/addCategory" })
                }
                className="bg-[#2563eb] flex rounded-lg w-10 h-10 justify-center items-center"
              >
                <Icon name="duplicate-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          {budgets.filter(
            (item) => item.type === "weekly" || item.type === "monthly"
          ).length > 0 ? (
            <FlatList
              key={`budget-categories-${numColumns}`}
              data={budgets.filter(
                (item) => item.type === "weekly" || item.type === "monthly"
              )}
              renderItem={renderBudgetCard}
              keyExtractor={keyExtractor}
              numColumns={numColumns}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: 2 }}
            />
          ) : (
            <View className="bg-white rounded-xl p-6 mx-2 items-center">
              <Icon name="duplicate-outline" size={50} color="#9CA3AF" />
              <Text className="text-lg font-medium text-gray-700 mt-4 mb-2 text-center">
                No budget categories set yet
              </Text>
              <Text className="text-gray-500 text-center mb-4">
                Create budget categories to track your weekly and monthly
                spending.
              </Text>
              <View className="w-64">
                <CustomButton
                  title="Add Budget Category"
                  onPress={() =>
                    router.push({ pathname: "/(root)/(tabs)/addCategory" })
                  }
                  bgVariant="primary"
                  style={{ borderRadius: 12 }}
                />
              </View>
            </View>
          )}
        </View>

        {/* Savings Section */}
        <View className="mb-4">
          <Text className="text-lg font-semibold mb-2 text-gray-800 px-2">
            Savings
          </Text>
          <FlatList
            key={`savings-${numColumns}`}
            data={budgets.filter((item) => item.type === "savings")}
            renderItem={renderBudgetCard}
            keyExtractor={keyExtractor}
            numColumns={numColumns}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 2 }}
          />
        </View>

        {/* Fixed Costs Section */}
        {fixedCosts.length > 0 && (
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2 px-2">
              <Text className="text-lg font-semibold text-gray-800">
                Fixed Costs
              </Text>
              <View className="flex-row space-x-2">
                <TouchableOpacity
                  onPress={() =>
                    router.push("/(root)/(tabs)/fixed-cost-setup" as any)
                  }
                  className="bg-green-500 flex rounded-lg w-10 h-10 justify-center items-center"
                >
                  <Icon name="add-circle-outline" size={22} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={fixedCosts}
              renderItem={renderFixedCostCard}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: 2 }}
            />
          </View>
        )}
      </ScrollView>
      <TouchableOpacity
        className="
absolute bottom-[100px] right-6 bg-[#14B8A6] rounded-2xl w-16 h-16 justify-center items-center shadow-inner
mb-2"
        onPress={() =>
          router.push({ pathname: "/(root)/(tabs)/addTransaction" })
        }
      >
        <Icon name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
