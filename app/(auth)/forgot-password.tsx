import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSignIn } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { ReactNativeModal } from "react-native-modal";
import { images } from "@/constants";
import CustomButton from "@/components/CustomButton";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [secondFactor, setSecondFactor] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { isLoaded, signIn, setActive } = useSignIn();

  if (!isLoaded || !signIn) {
    return null;
  }

  // Send the password reset code to the user's email
  async function create() {
    if (!signIn) return;
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setSuccessfulCreation(true);
      setError("");
    } catch (err: any) {
      console.error("error", err.errors[0].longMessage);
      setError(err.errors[0].longMessage);
    }
  }

  // Reset the user's password.
  // Upon successful reset, the user will be
  // signed in and redirected to the home page
  async function reset() {
    if (!signIn) return;
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      // Check if 2FA is required
      if (result?.status === "needs_second_factor") {
        setSecondFactor(true);
        setError("");
      } else if (result?.status === "complete") {
        // Set the active session to
        // the newly created session (user is now signed in)
        await setActive({ session: result.createdSessionId });
        setError("");
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      console.error("error", err.errors[0].longMessage);
      setError(err.errors[0].longMessage);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Reset Password",
          headerBackTitle: "Back",
        }}
      />

      <View className="flex-1 p-4">
        <Text className="text-2xl font-bold mb-6">Forgot Password?</Text>

        {!successfulCreation && (
          <View className="space-y-4">
            <View>
              <Text className="text-gray-700 mb-2">Email Address</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity
              onPress={create}
              className="bg-blue-500 rounded-lg p-3 items-center"
            >
              <Text className="text-white font-semibold">Send Reset Code</Text>
            </TouchableOpacity>

            {error && <Text className="text-red-500 text-center">{error}</Text>}
          </View>
        )}

        {successfulCreation && (
          <View className="space-y-4">
            <View>
              <Text className="text-gray-700 mb-2">Reset Code</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Enter reset code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2">New Password</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Enter new password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              onPress={reset}
              className="bg-blue-500 rounded-lg p-3 items-center"
            >
              <Text className="text-white font-semibold">Reset Password</Text>
            </TouchableOpacity>

            {error && <Text className="text-red-500 text-center">{error}</Text>}
          </View>
        )}

        {secondFactor && (
          <Text className="text-red-500 text-center">
            2FA is required, but this UI does not handle that
          </Text>
        )}
      </View>

      <ReactNativeModal isVisible={showSuccessModal}>
        <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
          <Image
            source={images.check}
            className="w-[110px] h-[110px] mx-auto my-5"
          />

          <Text className="text-3xl font-JakartaBold text-center">
            Password Reset Successful
          </Text>
          <Text className="text-base text-gray-400 font-Jakarta text-center mt-2">
            Your password has been successfully reset.
          </Text>
          <CustomButton
            title="Back to Sign In"
            onPress={async () => {
              setShowSuccessModal(false);
              // Add a small delay to ensure modal animation completes
              await new Promise((resolve) => setTimeout(resolve, 300));
              router.push("/(auth)/sign-in");
            }}
            className="mt-5"
          />
        </View>
      </ReactNativeModal>
    </SafeAreaView>
  );
}
