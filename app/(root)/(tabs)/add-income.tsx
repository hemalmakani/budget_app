import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import { fetchAPI } from "@/lib/fetch";
import CustomDatePicker from "@/components/CustomDatePicker";

export default function AddIncome() {
  const { user } = useUser();
  const [form, setForm] = useState({
    source_name: "",
    amount: "",
    received_on: new Date(),
    recurring: false,
    frequency: "monthly",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.source_name || !form.amount) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetchAPI("/(api)/incomes/add", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          clerk_id: user?.id,
        }),
      });
      if (response.error) {
        throw new Error(response.error);
      }
      Alert.alert("Success", "Income added successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error adding income:", error);
      Alert.alert("Error", "Failed to add income");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-100"
      edges={["top", "right", "bottom", "left"]}
    >
      <ScrollView className="flex-1">
        <View className="py-4">
          <Text className="text-xl font-bold text-center text-gray-800">
            Add Income
          </Text>
        </View>
        <View className="p-6">
          <InputField
            label="Source Name"
            placeholder="Enter source name"
            value={form.source_name}
            onChangeText={(text) => setForm({ ...form, source_name: text })}
            containerStyle="bg-white border-gray-300 mb-4"
            inputStyle="bg-white"
          />
          <InputField
            label="Amount"
            placeholder="Enter amount"
            value={form.amount}
            onChangeText={(text) => setForm({ ...form, amount: text })}
            keyboardType="numeric"
            containerStyle="bg-white border-gray-300 mb-4"
            inputStyle="bg-white"
          />
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Received On
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="bg-white border border-gray-300 rounded-lg p-4 flex-row justify-between items-center mb-4"
          >
            <Text className="text-gray-700">
              {form.received_on.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <CustomDatePicker
            isVisible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            onDateChange={(date) => setForm({ ...form, received_on: date })}
            initialDate={form.received_on}
          />
          <View className="flex-row items-center space-x-2 mb-4">
            <TouchableOpacity
              onPress={() => setForm({ ...form, recurring: !form.recurring })}
              className={`w-6 h-6 rounded border ${
                form.recurring ? "bg-blue-500" : "bg-white"
              } border-gray-300`}
            />
            <Text className="text-gray-700">Recurring Income</Text>
          </View>
          {form.recurring && (
            <View className="mb-4">
              <Text className="text-gray-700 mb-2">Frequency</Text>
              <View className="flex-row space-x-2">
                {["weekly", "biweekly", "monthly"].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    onPress={() => setForm({ ...form, frequency: freq })}
                    className={`px-4 py-2 rounded-lg ${
                      form.frequency === freq ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  >
                    <Text
                      className={
                        form.frequency === freq ? "text-white" : "text-gray-700"
                      }
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View className="flex-row justify-between mt-8">
            <TouchableOpacity
              onPress={() => router.push("/(root)/(tabs)/home")}
              className="bg-gray-200 rounded-lg py-3 px-6"
            >
              <Text className="text-gray-800 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              className={`rounded-lg py-3 px-6 ${
                isLoading ? "bg-blue-400" : "bg-blue-600"
              }`}
            >
              <Text className="text-white font-semibold">
                {isLoading ? "Adding..." : "Add Income"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
