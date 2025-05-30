import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useDataStore } from "@/store/dataStore";
import { useState } from "react";

export default function Profile() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isLoading = useDataStore((state) => state.isLoading);
  const hasInitialDataLoaded = useDataStore(
    (state) => state.hasInitialDataLoaded
  );
  const userData = useDataStore((state) => state.userData);

  const handleLogout = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setIsSigningOut(true);
            try {
              // Clear any stored data first
              useDataStore.getState().clearData();

              // Sign out from Clerk
              await signOut();

              // Navigate to sign in screen after successful sign out
              router.replace("/(auth)/sign-in");
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert(
                "Sign Out Error",
                "Failed to sign out. Please try again."
              );
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (isLoading && !hasInitialDataLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-gray-200 justify-center items-center">
        <Text className="text-lg text-gray-600">Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-200">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-6">Profile</Text>
        <View className="space-y-4">
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <Text className="text-lg font-semibold mb-3">
              Profile Information
            </Text>
            <View className="space-y-2">
              <View>
                <Text className="text-gray-500">Name</Text>
                <Text className="text-lg">{userData?.name || "User"}</Text>
              </View>
              <View>
                <Text className="text-gray-500">Email</Text>
                <Text className="text-lg">
                  {userData?.email || user?.primaryEmailAddress?.emailAddress}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            disabled={isSigningOut}
            className={`rounded-lg w-full py-3 items-center mt-4 mb-8 ${
              isSigningOut ? "bg-red-300" : "bg-red-500"
            }`}
          >
            <Text className="text-white font-semibold text-lg">
              {isSigningOut ? "Signing Out..." : "Sign Out"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
