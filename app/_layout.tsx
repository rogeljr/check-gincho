// Comentário de teste para push no arquivo _layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useDeepLinkURL } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="cadastro-empresa" options={{ headerShown: false }} />
          <Stack.Screen name="validar-conta" options={{ headerShown: false }} />
          <Stack.Screen name="definir-senha" options={{ headerShown: false }} />
          <Stack.Screen name="assinatura-expirada" options={{ headerShown: false }} />
          <Stack.Screen name="assinatura" options={{ headerShown: true, title: 'Assinatura e Pagamento' }} />
          <Stack.Screen name="configuracoes" options={{ headerShown: true, title: 'Configurações' }} />
          <Stack.Screen name="selecionar-licencas" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="sinistro/novo" options={{ headerShown: true, title: 'Novo Sinistro' }} />
          <Stack.Screen name="sinistro/fotos" options={{ headerShown: true, title: 'Fotos' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
