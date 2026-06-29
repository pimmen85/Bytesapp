import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing, typography } from '../theme/theme';

/**
 * Pulserande "LIVE"-badge. Pulsen är funktionell mikrointeraktion (signalerar
 * realtid), inte dekoration – enligt design-spelboken.
 */
export function LiveBadge({ minute }: { minute?: number }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.text}>
        LIVE{minute != null ? ` · ${minute}'` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.liveGlow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.live,
  },
  text: {
    ...typography.micro,
    color: palette.live,
  },
});
