import React from "react";
import { View, Image, ImageSourcePropType } from "react-native";
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
    className={`flex flex-row justify-center items-center rounded-full ${
      focused ? "bg-blue-400" : ""
    }`}
  >
    <View
      className={`rounded-full w-12 h-12 items-center justify-center ${
        focused ? "bg-blue-600" : ""
      }`}
    >
      <Icon name={iconName} size={28} color="white" />
    </View>
  </View>
);

const Layout = () => {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "white",
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: "#333333",
          borderRadius: 50,
          height: 60,
          paddingBottom: 0,
          paddingHorizontal: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexDirection: "row",
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
    </Tabs>
  );
};

export default Layout;
