import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Platform, View, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, List, Wallet, MoreHorizontal, Plus, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../theme';
import { Caption } from '../components/ui/Text';
import { TransactionModal } from '../components/financial/TransactionModal';
import BankIncomeModal from '../components/financial/BankIncomeModal';
import { useOrganization } from '../hooks/useOrganization';
import { useMonthlyFinancials } from '../hooks/useMonthlyFinancials';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import FinancesStackNavigator from './FinancesStackNavigator';
import MoreStackNavigator from './MoreStackNavigator';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBankIncomeModal, setShowBankIncomeModal] = useState(false);
  const [fabActionsVisible, setFabActionsVisible] = useState(false);
  const [transactionType, setTransactionType] = useState('expense');
  
  // Animações para os botões de ação aparecerem sequencialmente
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const slideAnim1 = useRef(new Animated.Value(20)).current;
  const slideAnim2 = useRef(new Animated.Value(20)).current;
  
  // Animação rotacional do FAB (+ para X)
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const { organization, user, costCenters, budgetCategories, isSoloUser } = useOrganization();
  const insets = useSafeAreaInsets();
  const currentMonth = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }, []);

  const {
    costCenters: modalCostCenters = [],
    cards: modalCards = [],
    categories: modalCategories = [],
  } = useMonthlyFinancials(organization, currentMonth);

  const incomeCategories = useMemo(() => {
    if (!budgetCategories || budgetCategories.length === 0) {
      console.log('MainTabNavigator: budgetCategories vazio ou não carregado');
      return [];
    }
    
    const filtered = budgetCategories.filter(
      (cat) => !cat?.type || cat.type === 'income' || cat.type === 'both'
    );
    
    console.log('MainTabNavigator: Categorias de entrada filtradas:', {
      total: budgetCategories.length,
      income: filtered.length,
    });
    
    return filtered;
  }, [budgetCategories]);

  const handleSaveTransaction = async (transactionData) => {
    console.log('Nova transação:', transactionData);
    // TODO: Implementar salvamento na API
    setShowTransactionModal(false);
  };

  const IOS_TAB_BOTTOM_PADDING = spacing[5];

  // Animar botões quando fabActionsVisible mudar
  useEffect(() => {
    if (fabActionsVisible) {
      // Resetar animações
      fadeAnim1.setValue(0);
      fadeAnim2.setValue(0);
      slideAnim1.setValue(20);
      slideAnim2.setValue(20);

      // Animar rotação do FAB (0 a 45 graus para o X)
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Animar primeiro botão
      Animated.parallel([
        Animated.timing(fadeAnim1, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim1, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Animar segundo botão com delay
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim2, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim2, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }, 100);
    } else {
      // Animar rotação do FAB de volta (45 a 0 graus para o +)
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Resetar quando fechar
      fadeAnim1.setValue(0);
      fadeAnim2.setValue(0);
      slideAnim1.setValue(20);
      slideAnim2.setValue(20);
    }
  }, [fabActionsVisible]);

  // Calcular altura do tabBar considerando safe area apenas no Android
  // iOS mantém comportamento original (mais fino e minimalista)
  const baseTabBarHeight = Platform.OS === 'ios' ? 58 : 64;
  const safeBottomPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, spacing[1.5])
    : IOS_TAB_BOTTOM_PADDING;
  const tabBarHeight = baseTabBarHeight + safeBottomPadding;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.background.secondary,
          borderTopWidth: 1,
          borderTopColor: colors.border.light,
          paddingTop: Platform.OS === 'ios' ? spacing[0.5] : spacing[1],
          paddingBottom: Platform.OS === 'android' 
            ? Math.max(insets.bottom, spacing[1.5])
            : IOS_TAB_BOTTOM_PADDING,
          height: tabBarHeight,
          elevation: 0,
          shadowColor: 'transparent',
          zIndex: 0, // Tab bar com z-index 0
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: Platform.OS === 'ios' ? spacing[0.25] : spacing[0.5],
        },
        tabBarItemStyle: {
          paddingTop: Platform.OS === 'ios' ? 0 : spacing[0.5],
        },
      }}
    >
      <Tab.Screen
        name="Início"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Transações"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <List size={size} color={color} />,
          tabBarItemStyle: {
            paddingTop: Platform.OS === 'ios' ? 0 : spacing[0.5],
            marginRight: spacing[4], // Move Transações para a esquerda, dando espaço ao FAB
          },
        }}
      />
      <Tab.Screen
        name="Finanças"
        component={FinancesStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
          tabBarItemStyle: {
            paddingTop: Platform.OS === 'ios' ? 0 : spacing[0.5],
            marginLeft: spacing[4], // Move Finanças para a direita, dando espaço ao FAB
          },
        }}
      />
      <Tab.Screen
        name="Mais"
        component={MoreStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MoreHorizontal size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>

      {/* FAB - Renderizado ACIMA das tabs (metade dentro/fora) */}
      <TouchableOpacity 
        style={[
          styles.fab,
          {
            // FAB tem 64px de altura, então 32px deve ficar dentro e 32px fora
            // bottom = altura do tab bar - metade do FAB (32px)
            bottom: tabBarHeight - 32,
          }
        ]}
        activeOpacity={1}
        onPress={() => setFabActionsVisible((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={fabActionsVisible ? "Fechar menu" : "Adicionar transação"}
        accessibilityHint={fabActionsVisible ? "Fechar seleção de tipo de transação" : "Abrir seleção de tipo de transação"}
      >
        <View style={styles.fabButton}>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            }}
          >
            <Plus size={28} color={colors.neutral[0]} strokeWidth={2.5} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {fabActionsVisible && (
        <View style={styles.fabOverlay} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={() => setFabActionsVisible(false)}>
            <View style={styles.overlayBackground} />
          </TouchableWithoutFeedback>
          <View style={[styles.fabActions, { bottom: tabBarHeight + spacing[6] }]}>
            <Animated.View
              style={{
                opacity: fadeAnim1,
                transform: [{ translateY: slideAnim1 }],
              }}
            >
              <TouchableOpacity
                style={styles.fabActionButton}
                onPress={() => {
                  setFabActionsVisible(false);
                  setShowBankIncomeModal(true);
                }}
              >
                <ArrowDownLeft size={20} color={colors.brand.primary} />
                <Caption style={styles.fabActionLabel}>Entrada</Caption>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View
              style={{
                opacity: fadeAnim2,
                transform: [{ translateY: slideAnim2 }],
              }}
            >
              <TouchableOpacity
                style={styles.fabActionButton}
                onPress={() => {
                  setTransactionType('expense');
                  setFabActionsVisible(false);
                  setShowTransactionModal(true);
                }}
              >
                <ArrowUpRight size={20} color={colors.error.main} />
                <Caption style={styles.fabActionLabel}>Despesa</Caption>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        visible={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setFabActionsVisible(false);
        }}
        onSave={handleSaveTransaction}
        type={transactionType}
        organization={organization}
        isSoloUser={isSoloUser}
        categories={modalCategories}
        costCenters={modalCostCenters}
        cards={modalCards}
      />

      <BankIncomeModal
        visible={showBankIncomeModal}
        onClose={() => {
          setShowBankIncomeModal(false);
          setFabActionsVisible(false);
        }}
        onSuccess={() => {
          setShowBankIncomeModal(false);
          setFabActionsVisible(false);
        }}
        organization={organization}
        costCenters={costCenters}
        incomeCategories={incomeCategories}
        selectedAccount={null}
        currentUser={user}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // FAB - Central no menu (metade dentro/fora)
  fab: {
    position: 'absolute',
    left: '50%',
    marginLeft: -32, // Metade da largura do botão (64/2)
    zIndex: 9999,
    elevation: 100,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xl,
    borderWidth: 5,
    borderColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 100,
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  fabActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
  },
  fabActionButton: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.neutral[0],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 20,
  },
  fabActionLabel: {
    marginTop: spacing[0.5],
    color: colors.text.primary,
  },
});
