import { View, ScrollView, Image, Text } from "react-native";
import { images } from "@/constants";
import { icons } from "@/constants";
import InputField from "@/components/InputField";
import { useState } from "react";
const SignUp = () => {
  const [form, setFrom] = useState({
    name: "",
    email: "",
    password: "",
  });
  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 bg-white"></View>
      <View className="relative w-full h-[250px]">
        <Image source={images.signUpCar} className="z-0 w-full h-[250px]" />
        <Text className="text-2xl text-black font-JakartaSemiBold absolute bottom-5 left-5">
          Create Your Account
        </Text>
      </View>
      <View className="p-5">
        <InputField
          label="Name"
          placeholder="Enter your name"
          icon={icons.person}
          value={form.name}
          onChangeText={(value) => setFrom({ ...form, name: value })}
        />
      </View>
    </ScrollView>
  );
};

export default SignUp;
