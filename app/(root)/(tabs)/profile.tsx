import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/fetch";

export default function Profile() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [userData, setUserData] = useState<{
    email: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (user?.id) {
          console.log("Fetching user data for ID:", user.id);
          const response = await fetchAPI(`/(api)/user/${user.id}`);
          console.log("Received API response:", response);

          if (response.data) {
            setUserData(response.data);
          } else if (response.error) {
            console.error("API Error:", response.error);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user?.id]);

  useEffect(() => {
    console.log("Current userData state:", userData);
  }, [userData]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/(auth)/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleConnectBank = () => {
    router.push("/(root)/connect-bank");
  };

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
                <Text className="text-lg">{userData?.name || "N/A"}</Text>
              </View>
              <View>
                <Text className="text-gray-500">Email</Text>
                <Text className="text-lg">
                  {user?.primaryEmailAddress?.emailAddress}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleConnectBank}
            className="bg-blue-500 rounded-lg w-full py-3 items-center mt-8"
          >
            <Text className="text-white font-semibold text-lg">
              Connect Bank Account
            </Text>
          </TouchableOpacity>

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
