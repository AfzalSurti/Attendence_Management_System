import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getUser } from '../utils/storage';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';

// Employee
import DashboardScreen from '../screens/employee/DashboardScreen';
import AttendanceScreen from '../screens/employee/AttendanceScreen';
import HistoryScreen from '../screens/employee/HistoryScreen';

// Developer
import DevDashboardScreen from '../screens/developer/DevDashboardScreen';
import ManageEmployeesScreen from '../screens/developer/ManageEmployeesScreen';
import ManageProjectsScreen from '../screens/developer/ManageProjectsScreen';

// Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AttendanceReportScreen from '../screens/admin/AttendanceReportScreen';
import HolidayScreen from '../screens/admin/HolidayScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const user = await getUser();
    if (!user) {
      setInitialRoute('Login');
    } else if (user.role === 'admin') {
      setInitialRoute('AdminDashboard');
    } else if (user.role === 'developer') {
      setInitialRoute('DevDashboard');
    } else {
      setInitialRoute('Dashboard');
    }
  };

  if (!initialRoute) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        {/* Auth */}
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* Employee */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Attendance" component={AttendanceScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />

        {/* Developer */}
        <Stack.Screen name="DevDashboard" component={DevDashboardScreen} />
        <Stack.Screen name="ManageEmployees" component={ManageEmployeesScreen} />
        <Stack.Screen name="ManageProjects" component={ManageProjectsScreen} />

        {/* Admin */}
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} />
        <Stack.Screen name="Holidays" component={HolidayScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}