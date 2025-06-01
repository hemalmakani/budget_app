import {
  View,
  ScrollView,
  Image,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { images } from "@/constants";
import { icons } from "@/constants";
import InputField from "@/components/InputField";
import { useState } from "react";
import CustomButton from "@/components/CustomButton";
import { Link } from "expo-router";
import OAuth from "@/components/OAuth";
import { useSignUp } from "@clerk/clerk-expo";
import { ReactNativeModal } from "react-native-modal";
import { router } from "expo-router";
import { fetchAPI } from "@/lib/fetch";

const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [form, setFrom] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [verification, setVerification] = useState({
    state: "default",
    error: "",
    code: "",
  });

  const onSignUpPress = async () => {
    if (!isLoaded) {
      return;
    }

    try {
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setVerification({
        ...verification,
        state: "pending",
        error: "",
      });
    } catch (err: any) {
      Alert.alert("Error", err.errors[0].longMessage);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verification.code,
      });

      if (completeSignUp.status === "complete") {
        await fetchAPI("/(api)/user", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            clerkId: completeSignUp.createdUserId,
          }),
        });

        await setActive({ session: completeSignUp.createdSessionId });
        setVerification({
          state: "success",
          error: "",
          code: verification.code,
        });
      } else {
        setVerification({
          ...verification,
          error: "Verification Failed",
          state: "failed",
        });
      }
    } catch (err: any) {
      setVerification({
        ...verification,
        error: err.errors[0].longMessage,
        state: "failed",
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <View className="w-[90%] mx-auto">
          <View className="h-[100px] flex-row justify-between items-center">
            <Text className="text-2xl text-black font-JakartaSemiBold">
              Create Your Account
            </Text>
            <Image
              source={images.signUpCar}
              className="w-[200px] h-[80px]"
              resizeMode="contain"
            />
          </View>
          <View>
            <InputField
              label="Name"
              placeholder="Enter your name"
              icon={icons.person}
              value={form.name}
              onChangeText={(value) => setFrom({ ...form, name: value })}
            />
            <InputField
              label="Email"
              placeholder="Enter your email"
              icon={icons.email}
              value={form.email}
              onChangeText={(value) => setFrom({ ...form, email: value })}
            />
            <InputField
              label="Password"
              placeholder="Enter your password"
              icon={icons.lock}
              secureTextEntry={true}
              value={form.password}
              onChangeText={(value) => setFrom({ ...form, password: value })}
            />
            <CustomButton
              title="Sign Up"
              onPress={onSignUpPress}
              className="mt-6 bg-[#14B8A6]"
            />
            <OAuth />
            <Link
              href="/sign-in"
              className="text-lg text-center text-general-200 mt-10"
            >
              <Text>Already have an account? </Text>
              <Text className="text-primary-500">Log In </Text>
            </Link>
          </View>
        </View>

        <ReactNativeModal
          isVisible={verification.state === "pending"}
          onModalHide={() => {
            if (verification.state === "success") {
              setTimeout(() => {
                setShowSuccessModal(true);
              }, 100);
            }
          }}
          backdropOpacity={0.5}
          animationIn="slideInUp"
          animationOut="slideOutDown"
        >
          <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
            <Text className="text-2xl font-JakartaExtraBold mb-2">
              Verification
            </Text>
            <Text className="font-Jakarta mb-5">
              We've sent a verification code to {form.email}
            </Text>

            <InputField
              label="Code"
              icon={icons.lock}
              placeholder="12345"
              value={verification.code}
              keyboardType="numeric"
              onChangeText={(code) =>
                setVerification({ ...verification, code })
              }
            />
            {verification.error && (
              <Text className="text-red-500 text-sm mt-1">
                {verification.error}
              </Text>
            )}
            <CustomButton
              title="Verify Email"
              onPress={onPressVerify}
              className="mt-5 bg-success-500"
            />
          </View>
        </ReactNativeModal>

        <ReactNativeModal
          isVisible={showSuccessModal}
          backdropOpacity={0.5}
          animationIn="zoomIn"
          animationOut="zoomOut"
        >
          <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
            <Image
              source={images.check}
              className="w-[110px] h-[110px] mx-auto my-5"
            />

            <Text className="text-3xl font-JakartaBold text-center">
              Verified
            </Text>
            <Text className="text-base text-gray-400 font-Jakarta text-center mt-2">
              You have successfully verified your account.
            </Text>
            <CustomButton
              title="Browse Home"
              onPress={() => {
                setShowSuccessModal(false);
                setVerification({
                  state: "default",
                  error: "",
                  code: "",
                });
                router.replace("/(root)/(tabs)/home");
              }}
              className="mt-5"
            />
          </View>
        </ReactNativeModal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUp;
