import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { palette } from '../../src/theme/theme';

/** Bottom-tab-navigation (tumvänligt, plattformsstandard) per design-spelboken. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: palette.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: palette.bgElevated,
          borderTopColor: palette.border,
        },
        tabBarActiveTintColor: palette.pitch,
        tabBarInactiveTintColor: palette.textFaint,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Matcher',
          tabBarIcon: ({ color }) => <TabIcon glyph="⚽" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Notiser',
          tabBarIcon: ({ color }) => <TabIcon glyph="🔔" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}
