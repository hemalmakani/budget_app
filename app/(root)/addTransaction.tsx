import React, { useState } from "react";
import { Text, View, Button, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import InputField from "@/components/InputField";

const AddTransaction = () => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header Section */}
      <View className="relative w-full bg-gray-200">
        <Text className="text-2xl text-black font-JakartaSemiBold absolute bottom-5 left-5">
          Add a new transaction
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default AddTransaction;
