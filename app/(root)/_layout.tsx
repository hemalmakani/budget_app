import { Stack } from "expo-router";
import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useDataStore } from "@/store/dataStore";
import { useRouter } from "expo-router";

const Layout = () => {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const router = useRouter();
  const loadAllData = useDataStore((state) => state.loadAllData);
  const clearData = useDataStore((state) => state.clearData);

  useEffect(() => {
    // Only proceed if both auth and user data are loaded
    if (!authLoaded || !userLoaded) {
      return;
    }

    // If user is not signed in, clear data and redirect to auth
    if (!isSignedIn) {
      clearData();
      router.replace("/(auth)/welcome");
      return;
    }

    // If user is signed in and has user data, load their data
    if (user?.id) {
      loadAllData(user.id);
    }
  }, [
    authLoaded,
    userLoaded,
    isSignedIn,
    user?.id,
    loadAllData,
    clearData,
    router,
  ]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
