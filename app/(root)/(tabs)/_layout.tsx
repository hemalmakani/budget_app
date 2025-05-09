import React from "react";
import { View, Image, ImageSourcePropType, Text } from "react-native";
import { Tabs } from "expo-router";
import { icons } from "@/constants";
import Icon from "react-native-vector-icons/Ionicons";

const TabIcon = ({
  iconName,
  focused,
}: {
  iconName: string;
  focused: boolean;
}) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: focused ? "#2563eb" : "#f3f4f6",
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginVertical: 0,
      shadowColor: focused ? "#2563eb" : "transparent",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: focused ? 0.15 : 0,
      shadowRadius: 4,
      elevation: focused ? 2 : 0,
      height: 48,
      minWidth: 48,
    }}
  >
    <Icon name={iconName} size={22} color={focused ? "white" : "#2563eb"} />
  </View>
);

const Layout = () => {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 24,
          left: 48,
          right: 48,
          backgroundColor: "white",
          borderRadius: 32,
          height: 72,
          paddingBottom: 0,
          paddingHorizontal: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
          borderTopWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName={"home-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName={"receipt-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName={"stats-chart-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName={"person-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="addCategory"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="addTransaction"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="goal-setup"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="edit-goal"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-budget"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

export default Layout;
