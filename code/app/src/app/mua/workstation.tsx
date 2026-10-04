import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function MuaWorkstationRedirect() {
  useEffect(() => {
    if (router.canGoBack()) {
      router.dismissAll();
    }
    router.replace('/');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="small" color="#E11D48" />
    </View>
  );
}
