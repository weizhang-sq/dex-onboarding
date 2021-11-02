import { HomeScreen } from './HomeScreen';
import { Loading } from './EasyLoading';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

// Ignore the known warnings
LogBox.ignoreLogs([
  'Constants.deviceId has been deprecated in favor of generating and storing your own ID. This API will be removed in SDK 44.'
]);

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name='Home' component={HomeScreen} />
      </Stack.Navigator>
      <Loading loadingText={'Loading...'} />
    </NavigationContainer>
  );
}
