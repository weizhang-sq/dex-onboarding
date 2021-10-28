import { StyleSheet, View } from 'react-native';

import { HomeScreen } from './HomeScreen';
import { Provider as PaperProvider } from 'react-native-paper';
import React from 'react';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <PaperProvider>
      <View style={styles.container}>
        <StatusBar style="auto" />
        <HomeScreen />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
});
