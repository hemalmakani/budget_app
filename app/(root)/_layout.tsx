import { Stack } from "expo-router";
import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useDataStore } from "@/store/dataStore";

const Layout = () => {
  const { user } = useUser();
  const loadAllData = useDataStore((state) => state.loadAllData);

  useEffect(() => {
    if (user?.id) {
      loadAllData(user.id);
    }
  }, [user?.id]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
