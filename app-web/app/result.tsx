import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Image, Platform, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import GradientBg from './components/GradientBg';
import { getStore } from './lib/store';

export default function ResultScreen() {
  const store = getStore();
  const resultImage = store.resultImage;
  const personImage = store.personImage;
  const clothingImage = store.clothingImage;
  const sizeRec = store.sizeRecommendation;
  const [viewMode, setViewMode] = useState<'result' | 'compare'>('result');

  const share = async () => {
    if (!resultImage) return;
    if (Platform.OS === 'web' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'My FitMe Try-On',
          text: `Just tried on ${store.clothingName} with FitMe AI!`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share — no action needed
      }
    } else {
      Alert.alert('Share', 'Copy the image URL to share it!');
    }
  };

  const download = async () => {
    if (!resultImage) return;
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `fitme-tryon-${Date.now()}.png`;
      link.click();
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to save images to your gallery.');
        return;
      }
      const filename = `${FileSystem.cacheDirectory}fitme-tryon-${Date.now()}.jpg`;
      await FileSystem.downloadAsync(resultImage, filename);
      await MediaLibrary.saveToLibraryAsync(filename);
      Alert.alert('Saved!', 'Image saved to your gallery.');
    } catch {
      Alert.alert('Error', 'Could not save the image. Please try again.');
    }
  };

  if (!resultImage) {
    return (
      <GradientBg variant="subtle" style={styles.flex}>
        <SafeAreaView style={styles.empty} edges={['top']}>
          <Ionicons name="image-outline" size={48} color="#6B46C1" />
          <Text style={styles.emptyTitle}>No try-on yet</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.replace('/tryon')}>
            <Text style={styles.emptyBtnText}>Start Try-On</Text>
          </Pressable>
        </SafeAreaView>
      </GradientBg>
    );
  }

  return (
    <GradientBg variant="subtle" style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle}>Your Try-On</Text>
          <Pressable style={styles.backBtn} onPress={share}>
            <Ionicons name="share-social" size={18} color="#fff" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* View mode toggle */}
          <View style={styles.toggle}>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'result' && styles.toggleBtnActive]}
              onPress={() => setViewMode('result')}
            >
              <Ionicons name="sparkles" size={14} color={viewMode === 'result' ? '#fff' : '#A78BFA'} />
              <Text style={[styles.toggleText, viewMode === 'result' && styles.toggleTextActive]}>AI Result</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'compare' && styles.toggleBtnActive]}
              onPress={() => setViewMode('compare')}
            >
              <Ionicons name="git-compare" size={14} color={viewMode === 'compare' ? '#fff' : '#A78BFA'} />
              <Text style={[styles.toggleText, viewMode === 'compare' && styles.toggleTextActive]}>Compare</Text>
            </Pressable>
          </View>

          {viewMode === 'result' ? (
            <View style={styles.resultCard}>
              <Image source={{ uri: resultImage }} style={styles.resultImg} resizeMode="cover" />
              <View style={styles.resultBadge}>
                <Ionicons name="sparkles" size={12} color="#FBBF24" />
                <Text style={styles.resultBadgeText}>AI GENERATED</Text>
              </View>
            </View>
          ) : (
            <View style={styles.compareRow}>
              <View style={styles.compareCol}>
                <Text style={styles.compareLabel}>Before</Text>
                {personImage && <Image source={{ uri: personImage }} style={styles.compareImg} resizeMode="cover" />}
              </View>
              <View style={styles.compareCol}>
                <Text style={styles.compareLabel}>After</Text>
                <Image source={{ uri: resultImage }} style={styles.compareImg} resizeMode="cover" />
              </View>
            </View>
          )}

          {/* Item name */}
          <View style={styles.itemRow}>
            {clothingImage && <Image source={{ uri: clothingImage }} style={styles.itemThumb} />}
            <View style={styles.flex}>
              <Text style={styles.itemBrand}>YOU'RE WEARING</Text>
              <Text style={styles.itemName} numberOfLines={1}>{store.clothingName}</Text>
            </View>
          </View>

          {/* Size recommendation */}
          {sizeRec && (
            <View style={styles.sizeCard}>
              <View style={styles.sizeHead}>
                <View style={styles.sizeIcon}>
                  <Ionicons name="resize" size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.sizeTag}>RECOMMENDED SIZE</Text>
                  <Text style={styles.sizeMain}>Size {sizeRec.size}</Text>
                </View>
                <View style={styles.confidenceWrap}>
                  <Text style={styles.confidenceVal}>{sizeRec.confidence}%</Text>
                  <Text style={styles.confidenceLabel}>confidence</Text>
                </View>
              </View>

              {/* Confidence bar */}
              <View style={styles.confBarBg}>
                <View style={[styles.confBarFill, { width: `${sizeRec.confidence}%` }]} />
              </View>

              {sizeRec.reasoning && (
                <Text style={styles.sizeReason}>{sizeRec.reasoning}</Text>
              )}

              {sizeRec.fitNote && (
                <View style={styles.fitNote}>
                  <Ionicons name="information-circle" size={14} color="#A78BFA" />
                  <Text style={styles.fitNoteText}>{sizeRec.fitNote}</Text>
                </View>
              )}

              {/* Size chart */}
              <View style={styles.sizeChart}>
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => {
                  const isRec = s === sizeRec.size;
                  const isAlt = s === sizeRec.alternativeSize;
                  return (
                    <View
                      key={s}
                      style={[
                        styles.sizeChip,
                        isRec && styles.sizeChipActive,
                        isAlt && !isRec && styles.sizeChipAlt,
                      ]}
                    >
                      <Text style={[styles.sizeChipText, isRec && styles.sizeChipTextActive]}>{s}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#6B46C1' }]} />
                  <Text style={styles.legendText}>Best fit</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: 'rgba(167,139,250,0.4)' }]} />
                  <Text style={styles.legendText}>Alternative</Text>
                </View>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={download}>
              <Ionicons name="download" size={18} color="#fff" />
              <Text style={styles.actionText}>Save</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={share}>
              <Ionicons name="share-social" size={18} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.actionPrimary]}
              onPress={() => router.replace('/tryon')}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.actionText}>Try Another</Text>
            </Pressable>
          </View>

          <Pressable style={styles.linkBtn} onPress={() => router.push('/history')}>
            <Ionicons name="time-outline" size={16} color="#A78BFA" />
            <Text style={styles.linkText}>View all my try-ons</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GradientBg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptyBtn: { backgroundColor: '#6B46C1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '700' },

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

  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 8,
  },
  toggleBtnActive: { backgroundColor: '#6B46C1' },
  toggleText: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },

  resultCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A0B3D',
    position: 'relative',
    aspectRatio: 0.75,
  },
  resultImg: { width: '100%', height: '100%' },
  resultBadge: {
    position: 'absolute',
    top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
  },
  resultBadgeText: { color: '#FBBF24', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  compareRow: { flexDirection: 'row', gap: 10 },
  compareCol: { flex: 1, gap: 6 },
  compareLabel: { color: '#A78BFA', fontSize: 11, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  compareImg: { width: '100%', aspectRatio: 0.7, borderRadius: 16, backgroundColor: '#1A0B3D' },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 12,
    marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  itemThumb: { width: 50, height: 60, borderRadius: 10, backgroundColor: '#1A0B3D' },
  itemBrand: { color: '#A78BFA', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  itemName: { color: '#fff', fontSize: 15, fontWeight: '600', marginTop: 2 },

  sizeCard: {
    marginTop: 16,
    backgroundColor: 'rgba(107,70,193,0.12)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    gap: 12,
  },
  sizeHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sizeIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#6B46C1',
    alignItems: 'center', justifyContent: 'center',
  },
  sizeTag: { color: '#A78BFA', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  sizeMain: { color: '#fff', fontSize: 18, fontWeight: '800' },
  confidenceWrap: { marginLeft: 'auto', alignItems: 'flex-end' },
  confidenceVal: { color: '#10B981', fontSize: 20, fontWeight: '800' },
  confidenceLabel: { color: '#9CA3AF', fontSize: 10 },

  confBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  confBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },

  sizeReason: { color: '#D1D5DB', fontSize: 13, lineHeight: 18 },
  fitNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(167,139,250,0.1)',
    padding: 10,
    borderRadius: 10,
  },
  fitNoteText: { color: '#D1D5DB', fontSize: 12, flex: 1, lineHeight: 16 },

  sizeChart: { flexDirection: 'row', gap: 6, marginTop: 4 },
  sizeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sizeChipActive: { backgroundColor: '#6B46C1', borderColor: '#6B46C1' },
  sizeChipAlt: { backgroundColor: 'rgba(167,139,250,0.2)', borderColor: 'rgba(167,139,250,0.4)' },
  sizeChipText: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  sizeChipTextActive: { color: '#fff' },

  legend: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#9CA3AF', fontSize: 11 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionPrimary: {
    backgroundColor: '#6B46C1',
    ...(Platform.OS === 'web' ? { background: 'linear-gradient(120deg, #6B46C1, #3B82F6)' as any } : {}),
  },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, padding: 12 },
  linkText: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },
});
