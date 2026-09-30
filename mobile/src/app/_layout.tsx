import '@/global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from '@/components/LoginScreen';
import { SetupNotice } from '@/components/SetupNotice';
import { ToastProvider } from '@/components/ToastProvider';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { SUPABASE_CONFIGURED } from '@/lib/supabase-configured';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

// 앱이 백그라운드에 있는 동안엔 React Query도 리페치를 멈췄다가, 포그라운드로
// 돌아오면 오래된 화면(stale) 쿼리를 다시 불러온다 — 웹 버전의
// pageshow/visibilitychange 새로고침을 대체.
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

function RootContent() {
  const { session, loading } = useAuth();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  if (!SUPABASE_CONFIGURED) return <SetupNotice />;
  if (loading) return null;
  if (!session) return <LoginScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="room/[roomId]" />
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BottomSheetModalProvider>
              <ToastProvider>
                <RootContent />
              </ToastProvider>
            </BottomSheetModalProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
