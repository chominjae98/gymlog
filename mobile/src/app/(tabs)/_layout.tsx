import { Tabs } from "expo-router";
import { Home, Trophy, Users } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#17914f",
        tabBarInactiveTintColor: "#7a7d74",
        tabBarStyle: { borderTopColor: "#e7e5db" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "홈", tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="rooms"
        options={{ title: "내 방", tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="ranking"
        options={{ title: "랭킹", tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }}
      />
    </Tabs>
  );
}
