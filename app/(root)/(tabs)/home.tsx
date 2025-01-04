import React, { useState, useEffect } from "react";
import Icon from "react-native-vector-icons/Ionicons";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import BudgetCard from "@/components/BudgetCard";
import { useFetch } from "@/lib/fetch";
import { Budget } from "@/types/type";
import { router } from "expo-router";
import { useBudgetStore } from "@/store/index";

export default function Page() {
  const { user } = useUser();
  const { budgets, setBudgets, deleteBudget } = useBudgetStore();
  const { width } = useWindowDimensions();
  const [numColumns, setNumColumns] = useState(width > 600 ? 3 : 2);

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

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
    } catch (err) {
      console.error("Delete operation failed:", err);
    }
  };

  const renderBudgetCard = ({ item }: { item: Budget }) => (
    <BudgetCard budget={item} onDelete={handleDelete} />
  );

  const keyExtractor = (item: Budget, index: number) => `${item.id}-${index}`;

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 px-2">
        <View className="py-4">
          <Text className="text-xl font-bold text-center text-gray-800">
            Welcome, {userData?.name || "User"}
          </Text>
        </View>
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2 px-2">
            <Text className="text-lg font-semibold text-gray-800">
              Budget Categories
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: "/(root)/(tabs)/addCategory" })
              }
              className="bg-blue-500 flex rounded-lg w-10 h-10 justify-center items-center"
            >
              <Icon name="duplicate-outline" size={22} color="white" />
            </TouchableOpacity>
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
