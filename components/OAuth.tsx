import { View, Text, Image, Alert } from "react-native";
import CustomButton from "@/components/CustomButton";
import { useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { fetchAPI } from "@/lib/fetch";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { icons } from "@/constants";

// This is required for Expo Web Browser to work properly
WebBrowser.maybeCompleteAuthSession();

const OAuth = () => {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      const { createdSessionId, signIn, signUp, setActive } =
        await startOAuthFlow({
          redirectUrl: Linking.createURL("/(root)/(tabs)/home", {
            scheme: "budget_app",
          }),
        });

      // If sign in was successful
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });

        // Check if this is a new user who needs to be created in our database
        if (signUp?.createdUserId) {
          // Create user in our database for new signups
          try {
            await fetchAPI("/(api)/user", {
              method: "POST",
              body: JSON.stringify({
                name:
                  signUp.firstName && signUp.lastName
                    ? `${signUp.firstName} ${signUp.lastName}`.trim()
                    : signUp.emailAddress?.split("@")[0] || "User",
                email: signUp.emailAddress,
                clerkId: signUp.createdUserId,
              }),
            });
          } catch (error) {
            console.log("User might already exist in database:", error);
          }
        }

        router.replace("/(root)/(tabs)/home");
      }
    } catch (err: any) {
      console.error("OAuth error:", err);

      // Handle specific error cases
      if (err?.errors?.[0]?.code === "oauth_access_denied") {
        Alert.alert(
          "Access Denied",
          "You cancelled the Google sign-in process."
        );
      } else if (
        err?.errors?.[0]?.code === "oauth_email_domain_reserved_by_saml"
      ) {
        Alert.alert(
          "Email Domain Restricted",
          "This email domain is managed by your organization. Please use a different email or contact your administrator."
        );
      } else {
        Alert.alert(
          "Sign In Failed",
          "There was an error signing in with Google. Please try again."
        );
      }
    }
  };

  return (
    <View>
      <View className="flex flex-row justify-center items-center mt-4 gap-x-3">
        <View className="flex-1 h-[1px] bg-general-100" />
        <Text className="text-lg">Or</Text>
        <View className="flex-1 h-[1px] bg-general-100" />
      </View>

      <CustomButton
        title="Log in with Google"
        className="mt-5 w-full shadow-none"
        IconLeft={() => (
          <Image
            source={icons.google}
            resizeMode="contain"
            className="w-5 h-5 mx-2"
          />
        )}
        bgVariant="outline"
        textVariant="primary"
        onPress={handleGoogleSignIn}
      />
    </View>
  );
};

export default OAuth;
