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
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: focused ? "#14B8A6" : "#f3f4f6",
      borderRadius: 16,
      width: 44,
      height: 44,
      shadowColor: focused ? "#14B8A6" : "transparent",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: focused ? 0.15 : 0,
      shadowRadius: 4,
      elevation: focused ? 2 : 0,
    }}
  >
    <Icon name={iconName} size={20} color={focused ? "white" : "#14B8A6"} />
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
          width: "70%",
          marginHorizontal: "15%",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
          borderRadius: 24,
          height: 68,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
          borderTopWidth: 0,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 0,
        },
        tabBarItemStyle: {
          height: 68,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 15,
          paddingBottom: 0,
          margin: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
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
        name="banking"
        options={{
          title: "Banking",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName={"card-outline"} />
          ),
        }}
      />
      <Tabs.Screen
        name="addCategory"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="addTransaction"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="fixed-cost-setup"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="edit-fixed-cost"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="edit-budget"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="add-income"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

export default Layout;
