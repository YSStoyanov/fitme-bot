import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ClothingItem } from '../data/clothing';

type Props = {
  item: ClothingItem;
  onPress: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
};

export default function ClothingCard({ item, onPress, onFavorite, isFavorite }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        <Pressable style={styles.heart} onPress={onFavorite} hitSlop={8}>
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={isFavorite ? '#EF4444' : '#fff'} />
        </Pressable>
        <View style={styles.tryBadge}>
          <Ionicons name="sparkles" size={11} color="#fff" />
          <Text style={styles.tryText}>Try On</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.brand}>{item.brand}</Text>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <View style={styles.row}>
          <Text style={styles.price}>${item.price}</Text>
          <View style={styles.rating}>
            <Ionicons name="star" size={11} color="#FBBF24" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>
        <View style={styles.colorsRow}>
          {item.colors.slice(0, 4).map((c, i) => (
            <View key={i} style={[styles.color, { backgroundColor: c }]} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  imageWrap: { position: 'relative', aspectRatio: 0.85, backgroundColor: '#1A0B3D' },
  image: { width: '100%', height: '100%' },
  heart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(107,70,193,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tryText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  info: { padding: 12, gap: 4 },
  brand: { color: '#A78BFA', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  name: { color: '#fff', fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  price: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { color: '#D1D5DB', fontSize: 11, fontWeight: '600' },
  colorsRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  color: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});
