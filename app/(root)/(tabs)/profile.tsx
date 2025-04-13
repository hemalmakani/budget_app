import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useDataStore } from "@/store/dataStore";

export default function Profile() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const isLoading = useDataStore((state) => state.isLoading);
  const hasInitialDataLoaded = useDataStore(
    (state) => state.hasInitialDataLoaded
  );
  const userData = useDataStore((state) => state.userData);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/(auth)/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (isLoading && !hasInitialDataLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-lg text-gray-600">Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
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
            className="bg-red-500 rounded-lg w-full py-3 items-center mt-4 mb-8"
          >
            <Text className="text-white font-semibold text-lg">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
