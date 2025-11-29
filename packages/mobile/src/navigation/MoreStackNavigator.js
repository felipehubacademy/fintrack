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
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import HelpScreen from '../screens/HelpScreen';
import SupportScreen from '../screens/SupportScreen';

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
      <Stack.Screen name="Insights" component={InsightsScreen} />
      <Stack.Screen name="Closing" component={ClosingScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="Investments" component={InvestmentsScreen} />
      <Stack.Screen name="CardDetail" component={CardDetailScreen} />
      <Stack.Screen name="BankAccountDetail" component={BankAccountDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
    </Stack.Navigator>
  );
}

