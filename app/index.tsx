import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Home = () => {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading state while authentication is being checked
  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-lg text-gray-600">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/welcome" />;
};

export default Home;
