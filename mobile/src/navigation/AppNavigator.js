import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getUser, clearStorage } from '../utils/storage';
import { wakeServer } from '../utils/wakeServer';
import { isEmployeeWebBlocked } from '../utils/platform';
import GeoLoader from '../components/GeoLoader';
import WebShell from '../components/WebShell';

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
import ProjectDetailsScreen from '../screens/developer/ProjectDetailsScreen';
import EmployeeAttendanceScreen from '../screens/developer/EmployeeAttendanceScreen';

// Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AttendanceReportScreen from '../screens/admin/AttendanceReportScreen';
import AdminEmployeeReportScreen from '../screens/admin/AdminEmployeeReportScreen';
import AdminProjectsScreen from '../screens/admin/AdminProjectsScreen';
import HolidayScreen from '../screens/admin/HolidayScreen';

const Stack = createNativeStackNavigator();

const resolveInitialRoute = async () => {
  const user = await getUser();
  if (!user) return 'Login';
  if (isEmployeeWebBlocked(user.role)) {
    await clearStorage();
    return 'Login';
  }
  if (user.role === 'admin') return 'AdminDashboard';
  if (user.role === 'developer') return 'DevDashboard';
  return 'Dashboard';
};

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('Connecting to server...');

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const started = Date.now();

      setLoadingMessage('Waking up server...');
      await wakeServer();

      if (!mounted) return;

      setLoadingMessage('Loading application...');
      const route = await resolveInitialRoute();

      const elapsed = Date.now() - started;
      if (elapsed < 1200) {
        await new Promise((r) => setTimeout(r, 1200 - elapsed));
      }

      if (mounted) setInitialRoute(route);
    };

    bootstrap();
    return () => { mounted = false; };
  }, []);

  if (!initialRoute) {
    return <GeoLoader message={loadingMessage} />;
  }

  return (
    <SafeAreaProvider>
      <WebShell>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
          >
            {/* Auth */}
            <Stack.Screen name="Login" component={LoginScreen} />

            {/* Employee — mobile only */}
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />

            {/* Developer */}
            <Stack.Screen name="DevDashboard" component={DevDashboardScreen} />
            <Stack.Screen name="ManageEmployees" component={ManageEmployeesScreen} />
            <Stack.Screen name="ManageProjects" component={ManageProjectsScreen} />
            <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
            <Stack.Screen name="EmployeeAttendance" component={EmployeeAttendanceScreen} />

            {/* Admin */}
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AttendanceReport" component={AttendanceReportScreen} />
            <Stack.Screen name="AdminEmployeeReport" component={AdminEmployeeReportScreen} />
            <Stack.Screen name="AdminProjects" component={AdminProjectsScreen} />
            <Stack.Screen name="Holidays" component={HolidayScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </WebShell>
    </SafeAreaProvider>
  );
}
