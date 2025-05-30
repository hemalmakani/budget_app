import { View, ScrollView, Image, Text, Alert } from "react-native";
import { images } from "@/constants";
import { icons } from "@/constants";
import InputField from "@/components/InputField";
import { useCallback, useState } from "react";
import CustomButton from "@/components/CustomButton";
import { Link, useRouter } from "expo-router";
import OAuth from "@/components/OAuth";
import { useSignIn } from "@clerk/clerk-expo";

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [form, setFrom] = useState({
    email: "",
    password: "",
  });

  const onSignInPress = useCallback(async () => {
    if (!isLoaded || isSigningIn) {
      return;
    }

    // Basic validation
    if (!form.email.trim() || !form.password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsSigningIn(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: form.email.trim(),
        password: form.password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        // Use replace instead of push to prevent back navigation to sign-in
        router.replace("/(root)/(tabs)/home");
      } else if (signInAttempt.status === "needs_second_factor") {
        // Handle 2FA if needed
        Alert.alert(
          "Two-Factor Authentication",
          "Please complete two-factor authentication"
        );
      } else {
        // Handle other statuses
        console.error(
          "Sign in incomplete:",
          JSON.stringify(signInAttempt, null, 2)
        );
        Alert.alert("Error", "Sign in failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Sign in error:", JSON.stringify(err, null, 2));

      // Better error messaging
      let errorMessage = "Sign in failed. Please try again.";
      if (err.errors && err.errors.length > 0) {
        errorMessage =
          err.errors[0].longMessage || err.errors[0].message || errorMessage;
      }

      Alert.alert("Sign In Error", errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  }, [
    isLoaded,
    signIn,
    setActive,
    form.email,
    form.password,
    router,
    isSigningIn,
  ]);

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
    >
      <View className="w-[90%] mx-auto">
        <View className="h-[100px] flex-row justify-between items-center">
          <Text className="text-2xl text-black font-JakartaSemiBold">
            Welcome 👋
          </Text>
          <Image
            source={images.signUpCar}
            className="w-[200px] h-[80px] ml-20"
            resizeMode="contain"
          />
        </View>
        <View>
          <InputField
            label="Email"
            placeholder="Enter your email"
            icon={icons.email}
            value={form.email}
            onChangeText={(value) => setFrom({ ...form, email: value })}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <InputField
            label="Password"
            placeholder="Enter your password"
            icon={icons.lock}
            secureTextEntry={true}
            value={form.password}
            onChangeText={(value) => setFrom({ ...form, password: value })}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <CustomButton
            title={isSigningIn ? "Signing In..." : "Sign In"}
            onPress={onSignInPress}
            className="mt-6"
            disabled={isSigningIn || !isLoaded}
          />
          <OAuth />
          <Link
            href="/sign-up"
            className="text-lg text-center text-general-200 mt-10"
          >
            <Text>Don't have an account? </Text>
            <Text className="text-primary-500">Sign Up </Text>
          </Link>
          <Link
            href="/forgot-password"
            className="text-lg text-center text-general-200 mt-4"
          >
            <Text className="text-primary-500">Forgot Password?</Text>
          </Link>
        </View>
      </View>
      {/* Verification Modal */}
    </ScrollView>
  );
};

export default SignIn;
