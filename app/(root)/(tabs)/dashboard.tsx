import { useUser } from "@clerk/clerk-expo";
import { Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const recentTransactions = [
  {
    transaction_id: "30b4f470-8330-47e4-8ceb-64e1983ce27f",
    transaction_name: "Test",
    budget_id: "11",
    budget_name: "Food",
    amount: "4.25",
    created_at: "2024-11-27 18:16:35.589589",
    clerk_id: "user_2pGbEOR0uclimVm8wDdKF11c3i2",
  },
  {
    transaction_id: "30b4f470-8330-47e4-8ceb-64e1983ce27f",
    transaction_name: "Test2",
    budget_name: "Clothes",
    budget_id: "29",
    amount: "7.00",
    created_at: "2024-11-28 03:10:05.804689",
    clerk_id: "user_2pGbEOR0uclimVm8wDdKF11c3i2",
  },
  {
    transaction_id: "46105f38-bfa4-4ee1-93b3-218dd627ca34",
    transaction_name: "Socks",
    budget_name: "Clothes",
    budget_id: "1",
    amount: "10.05",
    created_at: "2024-11-27 17:58:33.230542",
    clerk_id: "user_2pGbEOR0uclimVm8wDdKF11c3i2",
  },
  {
    transaction_id: "5a00e09a-0932-4b75-88ef-2410d0fa3294",
    transaction_name: "Lettuce",
    budget_name: "Food",
    budget_id: "31",
    amount: "2.00",
    created_at: "2024-11-27 18:27:25.569081",
    clerk_id: "user_2pGbEOR0uclimVm8wDdKF11c3i2",
  },
];

const Dashboard = () => {
  const { user } = useUser();
  return (
    <SafeAreaView className="mb-6 px-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-semibold text-gray-800">
          Transactions
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default Dashboard;
