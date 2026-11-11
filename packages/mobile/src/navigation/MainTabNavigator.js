import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, List, PieChart, MoreHorizontal, Plus } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import MoreStackNavigator from './MoreStackNavigator';

const Tab = createBottomTabNavigator();

function AddPlaceholder() { return null; }

export default function MainTabNavigator() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: isDark ? '#636366' : '#AEAEB2',
        tabBarStyle: {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? '#38383A' : '#E5E5EA',
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom || 20 : Math.max(insets.bottom, 12),
          height: 56 + (Platform.OS === 'ios' ? insets.bottom || 20 : Math.max(insets.bottom, 12)),
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Início"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ color, size }) => <LayoutGrid size={size - 2} color={color} /> }}
      />
      <Tab.Screen
        name="Transações"
        component={TransactionsScreen}
        options={{ tabBarIcon: ({ color, size }) => <List size={size - 2} color={color} /> }}
      />
      <Tab.Screen
        name="Adicionar"
        component={AddPlaceholder}
        options={({ navigation }) => ({
          tabBarButton: () => (
            <GoldFAB isDark={isDark} onPress={() => navigation.getParent()?.navigate('AddTransaction')} />
          ),
        })}
      />
      <Tab.Screen
        name="Orçamento"
        component={BudgetsScreen}
        options={{ tabBarIcon: ({ color, size }) => <PieChart size={size - 2} color={color} /> }}
      />
      <Tab.Screen
        name="Mais"
        component={MoreStackNavigator}
        options={{ tabBarIcon: ({ color, size }) => <MoreHorizontal size={size - 2} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

function GoldFAB({ isDark, onPress }) {
  return (
    <TouchableOpacity style={styles.fabContainer} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.fab, isDark && styles.fabDark]}>
        <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5A623',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDark: {
    shadowColor: '#FFB340',
    shadowOpacity: 0.25,
  },
});
