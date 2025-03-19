import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import TrackScreen from './screens/TrackScreen';
import HabitsScreen from './screens/HabitsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Track') {
              iconName = focused ? 'checkbox' : 'checkbox-outline';
            } else if (route.name === 'Habits') {
              iconName = focused ? 'list' : 'list-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Track" component={TrackScreen} />
        <Tab.Screen name="Habits" component={HabitsScreen} />
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
