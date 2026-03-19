import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import MainScreen from "./src/screens/MainScreen";
import ScanScreen from "./src/screens/ScanScreen";
import BatchDetailScreen from "./src/screens/BatchDetailScreen";

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#1B5E20" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainScreen}
          options={{ title: "Kijani Agent" }}
        />
        <Stack.Screen
          name="Scan"
          component={ScanScreen}
          options={{ title: "Scan QR" }}
        />
        <Stack.Screen
          name="BatchDetail"
          component={BatchDetailScreen}
          options={{ title: "Batch Provenance" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}