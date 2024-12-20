import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import CustomButton from "@/components/CustomButton";
import { useFetch } from "@/lib/fetch";
import { useEffect } from "react";

const Profile = () => {
  const { signOut } = useAuth();
  const { user } = useUser();

  const { data: userData, error } = useFetch<{
    email: string;
    name: string;
  }>(`/(api)/user/${user?.id}`);

  useEffect(() => {
    console.log("Clerk User ID:", user?.id);
    console.log("User Data from API:", userData);
    console.log("API Error:", error);
  }, [user?.id, userData, error]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/(auth)/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-8">Profile</Text>

      <View className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <View className="mb-4">
          <Text className="text-gray-500 text-sm mb-1">Name</Text>
          <Text className="text-lg font-semibold">
            {userData?.name || "N/A"}
          </Text>
        </View>
        <View>
          <Text className="text-gray-500 text-sm mb-1">Email</Text>
          <Text className="text-lg">
            {user?.primaryEmailAddress?.emailAddress || "N/A"}
          </Text>
        </View>
      </View>

      <CustomButton
        title="Logout"
        onPress={handleLogout}
        className="mt-4 bg-red-500 rounded-lg w-full"
      />
    </SafeAreaView>
  );
};

export default Profile;
