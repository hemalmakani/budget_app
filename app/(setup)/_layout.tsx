import { Stack } from "expo-router";

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen name="goal-setup" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
