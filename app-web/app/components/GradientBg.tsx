import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

type Props = {
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'hero' | 'card' | 'subtle';
};

export default function GradientBg({ children, style, variant = 'hero' }: Props) {
  // Web: real CSS gradient. Native: layered View fallback.
  const webStyle: any =
    variant === 'hero'
      ? { background: 'linear-gradient(135deg, #1A0B3D 0%, #3B1F7A 35%, #6B46C1 70%, #3B82F6 100%)' }
      : variant === 'card'
      ? { background: 'linear-gradient(140deg, rgba(107,70,193,0.18) 0%, rgba(59,130,246,0.12) 100%)' }
      : { background: 'linear-gradient(180deg, #0B0420 0%, #150A30 100%)' };

  return (
    <View style={[styles.base, variant === 'hero' && styles.hero, variant === 'card' && styles.card, variant === 'subtle' && styles.subtle, webStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {},
  hero: { backgroundColor: '#3B1F7A' },
  card: { backgroundColor: 'rgba(107,70,193,0.15)' },
  subtle: { backgroundColor: '#0B0420' },
});
