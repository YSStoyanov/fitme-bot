import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Image, TextInput, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import GradientBg from './components/GradientBg';
import { getStore, updateStore, prependHistoryItem } from './lib/store';
import { pickImageAsDataUrl, urlToDataUrl } from './lib/imagePicker';
import { supabase } from './lib/supabase';
import { saveHistoryItem } from './lib/history';
import { CLOTHING_ITEMS } from './data/clothing';


export default function TryOnScreen() {
  const [personImage, setPersonImage] = useState<string | null>(getStore().personImage);
  const [clothingImage, setClothingImage] = useState<string | null>(getStore().clothingImage);
  const [clothingName, setClothingName] = useState<string | null>(getStore().clothingName);
  const [fit, setFit] = useState<'tight' | 'regular' | 'loose'>(getStore().fit);
  const [height, setHeight] = useState(getStore().userHeight);
  const [weight, setWeight] = useState(getStore().userWeight);
  const [loading, setLoading] = useState(false);
  const [showQuickPick, setShowQuickPick] = useState(false);

  useEffect(() => {
    updateStore({ fit, userHeight: height, userWeight: weight });
  }, [fit, height, weight]);

  const pickPerson = async () => {
    const img = await pickImageAsDataUrl();
    if (img) {
      setPersonImage(img);
      updateStore({ personImage: img });
    } else if (Platform.OS !== 'web') {
      Alert.alert('Photo upload', 'Photo upload is supported on the web version. Try a demo photo below.');
    }
  };

  const useDemoPerson = (url: string) => {
    setPersonImage(url);
    updateStore({ personImage: url });
  };

  const pickClothing = async () => {
    const img = await pickImageAsDataUrl();
    if (img) {
      setClothingImage(img);
      setClothingName('Custom Item');
      updateStore({ clothingImage: img, clothingName: 'Custom Item', clothingCategory: 'custom' });
    }
  };

  const selectFromGallery = (item: typeof CLOTHING_ITEMS[number]) => {
    setClothingImage(item.image);
    setClothingName(item.name);
    updateStore({ clothingImage: item.image, clothingName: item.name, clothingCategory: item.category });
    setShowQuickPick(false);
  };

  const generate = async () => {
    if (!personImage || !clothingImage) {
      Alert.alert('Missing photos', 'Please add both your photo and a clothing item.');
      return;
    }
    setLoading(true);
    try {
      // Convert URL to data URL if needed
      let personData = personImage;
      let clothingData = clothingImage;
      if (clothingData.startsWith('http')) {
        clothingData = await urlToDataUrl(clothingData);
      }
      if (personData.startsWith('http')) {
        personData = await urlToDataUrl(personData);
      }

      const { data, error } = await supabase.functions.invoke('virtual-try-on', {
        body: {
          personImage: personData,
          clothingImage: clothingData,
          clothingName,
          fit,
          userHeight: height,
          userWeight: weight,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      updateStore({
        resultImage: data.imageUrl,
        sizeRecommendation: data.sizeRecommendation,
      });

      // Persist to database (storage of result image already happens server-side)
      const saved = await saveHistoryItem({
        clothingName: clothingName || 'Item',
        category: getStore().clothingCategory || 'custom',
        resultImage: data.imageUrl,
        personImage: personImage || undefined,
        clothingImageUrl: clothingImage || undefined,
        size: data.sizeRecommendation?.size || 'M',
        confidence: data.sizeRecommendation?.confidence || 85,
        fit,
        reasoning: data.sizeRecommendation?.reasoning,
        alternativeSize: data.sizeRecommendation?.alternativeSize,
        fitNote: data.sizeRecommendation?.fitNote,
      });
      if (saved) prependHistoryItem(saved);

      router.push('/result');
    } catch (e: any) {
      Alert.alert('Generation failed', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBg variant="subtle" style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle}>Virtual Try-On</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepLabel}>STEP 1</Text>
          <Text style={styles.stepTitle}>Add your photo</Text>
          <Text style={styles.stepHint}>Full-body mirror selfie works best</Text>

          <View style={styles.uploadCard}>
            {personImage ? (
              <View style={styles.preview}>
                <Image source={{ uri: personImage }} style={styles.previewImg} resizeMode="cover" />
                <Pressable style={styles.changeBtn} onPress={pickPerson}>
                  <Ionicons name="refresh" size={14} color="#fff" />
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.uploadZone} onPress={pickPerson}>
                <View style={styles.uploadIcon}>
                  <Ionicons name="camera" size={28} color="#A78BFA" />
                </View>
                <Text style={styles.uploadTitle}>Upload Your Photo</Text>
                <Text style={styles.uploadSub}>Tap to choose from your gallery</Text>
              </Pressable>
            )}
            <View style={styles.demoRow}>
              <Text style={styles.demoLabel}>Or try a demo:</Text>
              <View style={styles.demoImgs}>
                {DEMO_PEOPLE.map((url, i) => (
                  <Pressable key={i} onPress={() => useDemoPerson(url)} style={styles.demoImgWrap}>
                    <Image source={{ uri: url }} style={styles.demoImg} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.stepLabel}>STEP 2</Text>
          <Text style={styles.stepTitle}>Pick a clothing item</Text>
          <Text style={styles.stepHint}>Choose from our gallery or upload your own</Text>

          <View style={styles.uploadCard}>
            {clothingImage ? (
              <View style={styles.preview}>
                <Image source={{ uri: clothingImage }} style={styles.previewImg} resizeMode="cover" />
                <View style={styles.clothingLabel}>
                  <Text style={styles.clothingLabelText} numberOfLines={1}>{clothingName}</Text>
                </View>
                <Pressable style={styles.changeBtn} onPress={() => setShowQuickPick(true)}>
                  <Ionicons name="grid" size={14} color="#fff" />
                  <Text style={styles.changeText}>Browse</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.uploadZone} onPress={() => setShowQuickPick(true)}>
                <View style={styles.uploadIcon}>
                  <Ionicons name="shirt" size={28} color="#A78BFA" />
                </View>
                <Text style={styles.uploadTitle}>Pick from Gallery</Text>
                <Text style={styles.uploadSub}>15+ trending pieces</Text>
              </Pressable>
            )}
            <Pressable style={styles.uploadAltBtn} onPress={pickClothing}>
              <Ionicons name="cloud-upload-outline" size={16} color="#A78BFA" />
              <Text style={styles.uploadAltText}>Or upload your own image</Text>
            </Pressable>
          </View>

          {showQuickPick && (
            <View style={styles.quickPick}>
              <View style={styles.quickPickHead}>
                <Text style={styles.quickPickTitle}>Choose an item</Text>
                <Pressable onPress={() => setShowQuickPick(false)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {CLOTHING_ITEMS.map((item) => (
                  <Pressable key={item.id} style={styles.qpItem} onPress={() => selectFromGallery(item)}>
                    <Image source={{ uri: item.image }} style={styles.qpImg} />
                    <Text style={styles.qpName} numberOfLines={1}>{item.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={styles.stepLabel}>STEP 3</Text>
          <Text style={styles.stepTitle}>Customize the fit</Text>
          <Text style={styles.stepHint}>Tell us a bit more for the best size recommendation</Text>

          <View style={styles.fitRow}>
            {(['tight', 'regular', 'loose'] as const).map((f) => (
              <Pressable
                key={f}
                style={[styles.fitChip, fit === f && styles.fitChipActive]}
                onPress={() => setFit(f)}
              >
                <Text style={[styles.fitText, fit === f && styles.fitTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.measureRow}>
            <View style={styles.measureCol}>
              <Text style={styles.measureLabel}>Height (cm)</Text>
              <TextInput
                style={styles.measureInput}
                placeholder="170"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
              />
            </View>
            <View style={styles.measureCol}>
              <Text style={styles.measureLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.measureInput}
                placeholder="70"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
          </View>

          <Pressable
            style={[styles.generateBtn, loading && { opacity: 0.7 }]}
            onPress={generate}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={styles.generateText}>Generating your try-on...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.generateText}>Generate Try-On</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            AI-generated previews are approximate. Use them as a guide alongside the recommended size.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBg>
  );
}

const DEMO_PEOPLE = [
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&q=80',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=600&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80',
];

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

  stepLabel: { color: '#A78BFA', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 18 },
  stepTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  stepHint: { color: '#9CA3AF', fontSize: 13, marginTop: 4, marginBottom: 14 },

  uploadCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  uploadZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(167,139,250,0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(107,70,193,0.06)',
    gap: 6,
  },
  uploadIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(167,139,250,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  uploadTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  uploadSub: { color: '#9CA3AF', fontSize: 12 },
  uploadAltBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
  },
  uploadAltText: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },

  preview: { position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: 0.9 },
  previewImg: { width: '100%', height: '100%' },
  changeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  changeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  clothingLabel: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clothingLabelText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  demoRow: { marginTop: 12 },
  demoLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginBottom: 8 },
  demoImgs: { flexDirection: 'row', gap: 8 },
  demoImgWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  demoImg: { width: '100%', height: '100%' },

  quickPick: {
    marginTop: 12,
    padding: 14,
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  quickPickHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quickPickTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  qpItem: { width: 90, gap: 4 },
  qpImg: { width: 90, height: 110, borderRadius: 10, backgroundColor: '#1A0B3D' },
  qpName: { color: '#D1D5DB', fontSize: 10, fontWeight: '500' },

  fitRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  fitChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fitChipActive: { backgroundColor: '#6B46C1', borderColor: '#6B46C1' },
  fitText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  fitTextActive: { color: '#fff' },

  measureRow: { flexDirection: 'row', gap: 10 },
  measureCol: { flex: 1 },
  measureLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  measureInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: '#fff',
    fontSize: 14,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#6B46C1',
    ...(Platform.OS === 'web' ? { background: 'linear-gradient(120deg, #6B46C1 0%, #3B82F6 100%)' as any } : {}),
  },
  generateText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  disclaimer: { color: '#6B7280', fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 16 },
});
