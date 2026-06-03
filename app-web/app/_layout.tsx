import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

// Polyfill fetch to prevent Supabase from trying to import @supabase/node-fetch
if (typeof globalThis.fetch === 'undefined') {
  // @ts-ignore
  globalThis.fetch = fetch;
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0420' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="tryon" />
        <Stack.Screen name="result" />
        <Stack.Screen name="history" />
      </Stack>
    </>
  );
}
