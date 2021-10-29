import { HomeScreen } from './HomeScreen';
import { Loading } from './EasyLoading';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

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
