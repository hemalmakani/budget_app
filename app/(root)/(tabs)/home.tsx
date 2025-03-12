"use client";

import { useState, useEffect } from "react";
import Icon from "react-native-vector-icons/Ionicons";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import BudgetCard from "@/components/BudgetCard";
import GoalCard from "@/components/GoalCard";
import { useFetch } from "@/lib/fetch";
import type { Budget, Goal } from "@/types/type";
import { router } from "expo-router";
import { useBudgetStore, useGoalStore } from "@/store/index";
import CustomButton from "@/components/CustomButton";

export default function Page() {
  const { user } = useUser();
  const { budgets, setBudgets, deleteBudget } = useBudgetStore();
  const { goals, fetchGoals, deleteGoal } = useGoalStore();
  const { width } = useWindowDimensions();
  const [numColumns, setNumColumns] = useState(width > 600 ? 3 : 2);
  const [isLoading, setIsLoading] = useState(true);

  const {
    data: response,
    loading,
    error,
  } = useFetch<{ data: Budget[] }>(`/(api)/budgetLoad/${user?.id}`);

  const { data: userData } = useFetch<{
    name: string;
    email: string;
  }>(`/(api)/user/${user?.id}`);

  useEffect(() => {
    if (response) {
      setBudgets(response);
    }
  }, [response]);

  useEffect(() => {
    const newNumColumns = width > 600 ? 3 : 2;
    setNumColumns(newNumColumns);
  }, [width]);

  useEffect(() => {
    const loadGoals = async () => {
      if (user?.id) {
        try {
          await fetchGoals(user.id);
        } catch (error) {
          console.error("Failed to fetch goals:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadGoals();
  }, [user?.id]);

  const handleDeleteBudget = async (id: string) => {
    try {
      await deleteBudget(id);
    } catch (err) {
      console.error("Delete operation failed:", err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoal(id);
    } catch (err) {
      console.error("Delete goal operation failed:", err);
    }
  };

  const renderBudgetCard = ({ item }: { item: Budget }) => (
    <BudgetCard budget={item} onDelete={handleDeleteBudget} />
  );

  const renderGoalCard = ({ item }: { item: Goal }) => (
    <GoalCard goal={item} onDelete={handleDeleteGoal} />
  );

  const keyExtractor = (item: Budget | Goal, index: number) =>
    `${item.id}-${index}`;

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-2">
        <View className="py-4">
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
                className="bg-blue-500 flex rounded-lg w-10 h-10 justify-center items-center"
              >
                <Icon name="duplicate-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
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

        {/* Goals Section */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2 px-2">
            <Text className="text-lg font-semibold text-gray-800">
              Financial Goals
            </Text>
          </View>

          {goals.length > 0 ? (
            <FlatList
              data={goals}
              renderItem={renderGoalCard}
              keyExtractor={keyExtractor}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: 2 }}
            />
          ) : (
            <View className="bg-white rounded-xl p-6 mx-2 items-center">
              <Icon name="flag-outline" size={50} color="#9CA3AF" />
              <Text className="text-lg font-medium text-gray-700 mt-4 mb-2 text-center">
                No goals set yet
              </Text>
              <Text className="text-gray-500 text-center mb-4">
                Set financial goals to track your progress and stay motivated.
              </Text>
              <View className="w-64">
                <CustomButton
                  title="Create Your First Goal"
                  onPress={() => router.push("/(tabs)/goal-setup")}
                  bgVariant="primary"
                  style={{ borderRadius: 12 }}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <TouchableOpacity
        className="
absolute bottom-[100px] right-6 bg-blue-500 rounded-2xl w-16 h-16 justify-center items-center shadow-inner
"
        onPress={() =>
          router.push({ pathname: "/(root)/(tabs)/addTransaction" })
        }
      >
        <Icon name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
