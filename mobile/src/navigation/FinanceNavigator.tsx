import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import CustomBackButton from './CustomBackButton';
import FinanceDashboardScreen from '../screens/finance/FinanceDashboardScreen';
import ExpensesListScreen from '../screens/finance/ExpensesListScreen';
import AddExpenseScreen from '../screens/finance/AddExpenseScreen';
import type { FinanceStackParamList } from './types';

const Stack = createNativeStackNavigator<FinanceStackParamList>();

export default function FinanceNavigator() {
  const { colors, isDark } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerLeft: () => <CustomBackButton navigation={navigation} isDark={isDark} colors={colors} />,
        headerTintColor: '#FF6B00',
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
      })}
    >
      <Stack.Screen name="FinanceDashboard" component={FinanceDashboardScreen} options={{ title: 'Finansal Durum' }} />
      <Stack.Screen name="ExpensesList" component={ExpensesListScreen} options={{ title: 'Gider Listesi' }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Harcama Girişi' }} />
    </Stack.Navigator>
  );
}
