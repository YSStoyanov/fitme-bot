import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import GradientBg from './components/GradientBg';
import { getStore, subscribe, updateStore, setHistory, removeHistoryItem } from './lib/store';
import { fetchHistory, deleteHistoryItem, type HistoryRow } from './lib/history';

export default function HistoryScreen() {
  const [, setTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!getStore().historyLoaded);

  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  // Always refresh from DB when this screen mounts to stay in sync
  useEffect(() => {
    refresh(true);
  }, []);

  const refresh = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);
    try {
      const items = await fetchHistory();
      setHistory(items);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  const history = getStore().history;

  const viewItem = (item: HistoryRow) => {
    updateStore({
      resultImage: item.resultImage,
      personImage: item.personImage || null,
      clothingImage: item.clothingImageUrl || null,
      clothingName: item.clothingName,
      sizeRecommendation: {
        size: item.size,
        confidence: item.confidence,
        reasoning: item.reasoning || 'From your saved history.',
        alternativeSize: item.alternativeSize || 'M',
        fitNote: item.fitNote || `Originally tried with ${item.fit} fit.`,
      },
    });
    router.push('/result');
  };

  const onDelete = (item: HistoryRow) => {
    const confirmAndDelete = async () => {
      const ok = await deleteHistoryItem(item.id);
      if (ok) removeHistoryItem(item.id);
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Delete try-on "${item.clothingName}"?`)) {
        confirmAndDelete();
      }
    } else {
      Alert.alert('Delete try-on?', `"${item.clothingName}" will be permanently removed.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmAndDelete },
      ]);
    }
  };

  return (
    <GradientBg variant="subtle" style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle}>My Try-Ons</Text>
          <Pressable style={styles.backBtn} onPress={() => refresh()} disabled={refreshing}>
            {refreshing ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="refresh" size={18} color="#fff" />}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.stats}>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>{history.length}</Text>
              <Text style={styles.statLabel}>Try-Ons</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>
                {history.length > 0
                  ? Math.round(history.reduce((s, h) => s + h.confidence, 0) / history.length) + '%'
                  : '—'}
              </Text>
              <Text style={styles.statLabel}>Avg. Confidence</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statVal}>
                {new Set(history.map((h) => h.category)).size}
              </Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
          </View>

          {initialLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator color="#A78BFA" size="large" />
              <Text style={styles.emptySub}>Loading your try-ons...</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="shirt-outline" size={36} color="#A78BFA" />
              </View>
              <Text style={styles.emptyTitle}>No try-ons yet</Text>
              <Text style={styles.emptySub}>Start by trying on your first piece</Text>
              <Pressable style={styles.startBtn} onPress={() => router.replace('/tryon')}>
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={styles.startText}>Start Try-On</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.persistBanner}>
                <Ionicons name="cloud-done" size={14} color="#10B981" />
                <Text style={styles.persistText}>Saved to cloud — accessible across sessions</Text>
              </View>
              <View style={styles.grid}>
                {history.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <Pressable onPress={() => viewItem(item)}>
                      <Image source={{ uri: item.resultImage }} style={styles.cardImg} />
                    </Pressable>
                    <Pressable style={styles.delBtn} onPress={() => onDelete(item)} hitSlop={6}>
                      <Ionicons name="trash" size={13} color="#fff" />
                    </Pressable>
                    <Pressable style={styles.cardInfo} onPress={() => viewItem(item)}>
                      <Text style={styles.cardName} numberOfLines={1}>{item.clothingName}</Text>
                      <View style={styles.cardRow}>
                        <View style={styles.sizeBadge}>
                          <Text style={styles.sizeBadgeText}>Size {item.size}</Text>
                        </View>
                        <Text style={styles.conf}>{item.confidence}%</Text>
                      </View>
                      <Text style={styles.cardDate} numberOfLines={1}>{item.date}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

  stats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  statVal: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  persistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  persistText: { color: '#10B981', fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(167,139,250,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#9CA3AF', fontSize: 13, marginBottom: 14 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#6B46C1',
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12,
  },
  startText: { color: '#fff', fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  cardImg: { width: '100%', aspectRatio: 0.8, backgroundColor: '#1A0B3D' },
  delBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { padding: 10, gap: 6 },
  cardName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sizeBadge: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  sizeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  conf: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  cardDate: { color: '#6B7280', fontSize: 10 },
});
