import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ParentChildProvider } from './src/context/ParentChildContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ParentChildProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </ParentChildProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
