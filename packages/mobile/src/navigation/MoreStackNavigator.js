import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import MoreScreen from '../screens/MoreScreen';
import BillsScreen from '../screens/BillsScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import InsightsScreen from '../screens/InsightsScreen';
import ClosingScreen from '../screens/ClosingScreen';
import GoalsScreen from '../screens/GoalsScreen';
import InvestmentsScreen from '../screens/InvestmentsScreen';
import CardDetailScreen from '../screens/CardDetailScreen';
import BankAccountDetailScreen from '../screens/BankAccountDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import SupportScreen from '../screens/SupportScreen';
import { isFeatureEnabled } from '@fintrack/shared/config';
import { isRouteEnabled as isRouteOn } from './routes';

const isRouteEnabled = (name) => isRouteOn(name, isFeatureEnabled);

const Stack = createNativeStackNavigator();

export default function MoreStackNavigator() {
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
      <Stack.Screen name="MoreMenu" component={MoreScreen} />
      <Stack.Screen name="Bills" component={BillsScreen} />
      <Stack.Screen name="Budgets" component={BudgetsScreen} />
      {isRouteEnabled('Insights') && <Stack.Screen name="Insights" component={InsightsScreen} />}
      {isRouteEnabled('Closing') && <Stack.Screen name="Closing" component={ClosingScreen} />}
      {/* Hidden by launch flags (@fintrack/shared/config); nothing links to them when off. */}
      {isRouteEnabled('Goals') && <Stack.Screen name="Goals" component={GoalsScreen} />}
      {isRouteEnabled('Investments') && <Stack.Screen name="Investments" component={InvestmentsScreen} />}
      <Stack.Screen name="CardDetail" component={CardDetailScreen} />
      <Stack.Screen name="BankAccountDetail" component={BankAccountDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
    </Stack.Navigator>
  );
}

