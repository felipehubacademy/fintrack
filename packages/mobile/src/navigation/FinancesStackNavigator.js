import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import FinancesScreen from '../screens/FinancesScreen';
import CardDetailScreen from '../screens/CardDetailScreen';
import BankAccountDetailScreen from '../screens/BankAccountDetailScreen';

const Stack = createNativeStackNavigator();

export default function FinancesStackNavigator() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        gestureResponseDistance: 50,
      }}
    >
      <Stack.Screen name="FinancesMain" component={FinancesScreen} />
      <Stack.Screen name="CardDetail" component={CardDetailScreen} />
      <Stack.Screen name="BankAccountDetail" component={BankAccountDetailScreen} />
    </Stack.Navigator>
  );
}

