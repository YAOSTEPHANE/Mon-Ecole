import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useStaffWorkspace } from '../hooks/useStaffWorkspace';
import {
  canTakeAttendance,
  canEnterGrades,
  canUseAssistant,
  canViewAcademics,
  canViewAdminOps,
  canViewParentOps,
  canViewStaffOps,
} from '../lib/roles';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AdminHomeScreen from '../screens/AdminHomeScreen';
import AdminStudentsScreen from '../screens/AdminStudentsScreen';
import AdminAbsencesScreen from '../screens/AdminAbsencesScreen';
import AdminActivitiesScreen from '../screens/AdminActivitiesScreen';
import AdminPermissionRequestsScreen from '../screens/AdminPermissionRequestsScreen';
import StaffHomeScreen from '../screens/StaffHomeScreen';
import StaffCounterScreen from '../screens/StaffCounterScreen';
import StaffAdmissionsScreen from '../screens/StaffAdmissionsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AssistantScreen from '../screens/AssistantScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotesScreen from '../screens/NotesScreen';
import AbsencesScreen from '../screens/AbsencesScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import TeacherGradesScreen from '../screens/teacher/TeacherGradesScreen';
import TeacherLeavesScreen from '../screens/teacher/TeacherLeavesScreen';
import TeacherPayslipsScreen from '../screens/teacher/TeacherPayslipsScreen';
import ParentHomeScreen from '../screens/parent/ParentHomeScreen';
import ParentMessagesScreen from '../screens/parent/ParentMessagesScreen';
import ParentAppointmentsScreen from '../screens/parent/ParentAppointmentsScreen';
import ParentAssignmentsScreen from '../screens/parent/ParentAssignmentsScreen';
import ParentLessonLogsScreen from '../screens/parent/ParentLessonLogsScreen';
import ParentScheduleScreen from '../screens/parent/ParentScheduleScreen';
import ParentReportCardsScreen from '../screens/parent/ParentReportCardsScreen';
import ParentConductScreen from '../screens/parent/ParentConductScreen';
import ParentExtracurricularScreen from '../screens/parent/ParentExtracurricularScreen';
import ParentCampusScreen from '../screens/parent/ParentCampusScreen';
import ParentOrientationScreen from '../screens/parent/ParentOrientationScreen';
import ParentReenrollmentScreen from '../screens/parent/ParentReenrollmentScreen';
import ParentLibraryScreen from '../screens/parent/ParentLibraryScreen';
import ParentFamilyScreen from '../screens/parent/ParentFamilyScreen';
import PremiumTabBar from './PremiumTabBar';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.ink,
    border: colors.border,
    primary: colors.accent,
  },
};

function MainTabs() {
  const { user } = useAuth();
  const showAssistant = user ? canUseAssistant(user.role) : false;
  const role = user?.role ?? '';
  const showAcademics = canViewAcademics(role);
  const showAttendance = canTakeAttendance(role);
  const showEnterGrades = canEnterGrades(role);
  const showAdminOps = canViewAdminOps(role);
  const showStaffOps = canViewStaffOps(role);
  const showParentOps = canViewParentOps(role);
  const { hasModule } = useStaffWorkspace(showStaffOps);

  const HomeComponent = showAdminOps
    ? AdminHomeScreen
    : showStaffOps
      ? StaffHomeScreen
      : showParentOps
        ? ParentHomeScreen
        : HomeScreen;

  return (
    <Tab.Navigator
      tabBar={(props) => <PremiumTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      sceneContainerStyle={{ backgroundColor: colors.bg }}
    >
      <Tab.Screen name="Accueil" component={HomeComponent} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Alertes' }} />
      {showAdminOps ? <Tab.Screen name="Élèves" component={AdminStudentsScreen} /> : null}
      {showAdminOps ? (
        <Tab.Screen name="Assiduité" component={AdminAbsencesScreen} />
      ) : null}
      {showAdminOps ? (
        <Tab.Screen name="Demandes" component={AdminPermissionRequestsScreen} />
      ) : null}
      {showAdminOps ? (
        <Tab.Screen name="Activité" component={AdminActivitiesScreen} />
      ) : null}
      {showStaffOps && hasModule('counter') ? (
        <Tab.Screen name="Guichet" component={StaffCounterScreen} />
      ) : null}
      {showStaffOps && hasModule('admissions') ? (
        <Tab.Screen name="Admissions" component={StaffAdmissionsScreen} />
      ) : null}
      {showAcademics ? <Tab.Screen name="Notes" component={NotesScreen} /> : null}
      {showAcademics ? <Tab.Screen name="Absences" component={AbsencesScreen} /> : null}
      {showAcademics ? <Tab.Screen name="Paiements" component={PaymentsScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Devoirs" component={ParentAssignmentsScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Cahier" component={ParentLessonLogsScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Emploi" component={ParentScheduleScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Bulletins" component={ParentReportCardsScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Conduite" component={ParentConductScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Messages" component={ParentMessagesScreen} /> : null}
      {showParentOps ? <Tab.Screen name="RDV" component={ParentAppointmentsScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Parascolaire" component={ParentExtracurricularScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Campus" component={ParentCampusScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Orientation" component={ParentOrientationScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Réinscription" component={ParentReenrollmentScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Bibliothèque" component={ParentLibraryScreen} /> : null}
      {showParentOps ? <Tab.Screen name="Famille" component={ParentFamilyScreen} /> : null}
      {showAttendance ? (
        <Tab.Screen name="Appel" component={AttendanceScreen} options={{ title: 'Présence' }} />
      ) : null}
      {showEnterGrades ? (
        <Tab.Screen name="SaisieNotes" component={TeacherGradesScreen} options={{ title: 'Notes' }} />
      ) : null}
      {showEnterGrades ? (
        <Tab.Screen name="Congés" component={TeacherLeavesScreen} options={{ title: 'Congés' }} />
      ) : null}
      {showEnterGrades ? (
        <Tab.Screen name="MaPaie" component={TeacherPayslipsScreen} options={{ title: 'Paie' }} />
      ) : null}
      {showAssistant ? (
        <Tab.Screen name="Assistant" component={AssistantScreen} />
      ) : null}
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
