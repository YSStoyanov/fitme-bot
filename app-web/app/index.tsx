import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, FlatList, Image, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import GradientBg from './components/GradientBg';
import ClothingCard from './components/ClothingCard';
import { CLOTHING_ITEMS, CATEGORIES, ClothingItem } from './data/clothing';
import { updateStore, getStore, subscribe, setHistory } from './lib/store';
import { fetchHistory } from './lib/history';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);

  // Load persisted history from database on mount
  useEffect(() => {
    if (!getStore().historyLoaded) {
      fetchHistory().then((items) => setHistory(items)).catch(() => {});
    }
  }, []);


  const filtered = useMemo(() => {
    return CLOTHING_ITEMS.filter((item) => {
      const matchCat = category === 'all' || item.category === category;
      const q = query.toLowerCase().trim();
      const matchQ = !q || item.name.toLowerCase().includes(q) || item.brand.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [category, query]);

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSelectItem = (item: ClothingItem) => {
    updateStore({
      clothingImage: item.image,
      clothingName: item.name,
      clothingCategory: item.category,
    });
    router.push('/tryon');
  };

  const numColumns = width > 700 ? 3 : 2;
  const history = getStore().history;

  return (
    <GradientBg variant="subtle" style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.logoSmall}>FITORA</Text>
              <Text style={styles.logoTag}>AI Virtual Try-On</Text>
            </View>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/history')}>
              <Ionicons name="time-outline" size={22} color="#fff" />
              {history.length > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{history.length}</Text></View>
              )}
            </Pressable>
          </View>

          {/* Hero */}
          <HeroSection />

          {/* CTA - Start Try-On */}
          <Pressable
            style={({ pressed }) => [styles.ctaBig, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
            onPress={() => router.push('/tryon')}
          >
            <View style={styles.ctaIcon}>
              <Ionicons name="camera" size={26} color="#fff" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.ctaTitle}>Upload your photo</Text>
              <Text style={styles.ctaSub}>Take a mirror selfie & try anything on</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={32} color="#fff" />
          </Pressable>

          {/* How it works */}
          <View style={styles.howRow}>
            <HowStep num="1" icon="person" label="Your Photo" />
            <View style={styles.howLine} />
            <HowStep num="2" icon="shirt" label="Pick Outfit" />
            <View style={styles.howLine} />
            <HowStep num="3" icon="sparkles" label="AI Try-On" />
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search styles, brands..."
              placeholderTextColor="#6B7280"
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>

          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={[styles.catPill, category === cat.id && styles.catPillActive]}
              >
                <Ionicons name={cat.icon as any} size={15} color={category === cat.id ? '#fff' : '#A78BFA'} />
                <Text style={[styles.catText, category === cat.id && styles.catTextActive]}>{cat.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Section title */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Trending Pieces</Text>
            <Text style={styles.sectionCount}>{filtered.length} items</Text>
          </View>

          {/* Grid */}
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            numColumns={numColumns}
            key={numColumns}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <ClothingCard
                  item={item}
                  onPress={() => onSelectItem(item)}
                  onFavorite={() => toggleFav(item.id)}
                  isFavorite={favorites.has(item.id)}
                />
              </View>
            )}
          />

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={42} color="#6B46C1" />
              <Text style={styles.emptyText}>No matches. Try a different search.</Text>
            </View>
          )}

          {/* Newsletter */}
          <NewsletterSection />

          {/* Footer */}
          <FooterSection />
        </ScrollView>
      </SafeAreaView>
    </GradientBg>
  );
}

function HeroSection() {
  return (
    <GradientBg variant="hero" style={styles.hero}>
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <View style={styles.heroBadge}>
          <Ionicons name="sparkles" size={12} color="#FBBF24" />
          <Text style={styles.heroBadgeText}>POWERED BY AI</Text>
        </View>
        <Text style={styles.heroTitle}>Try it on,{'\n'}without trying it on.</Text>
        <Text style={styles.heroSub}>
          Snap a photo. Choose a piece. Our AI shows you exactly how it'll look — with smart size recommendations.
        </Text>
        <View style={styles.heroStats}>
          <HeroStat val="98%" label="Accuracy" />
          <View style={styles.heroDivider} />
          <HeroStat val="<15s" label="Generate" />
          <View style={styles.heroDivider} />
          <HeroStat val="50K+" label="Try-ons" />
        </View>
      </View>
      <View style={styles.heroBlob1} />
      <View style={styles.heroBlob2} />
    </GradientBg>
  );
}

function HeroStat({ val, label }: { val: string; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.heroStatVal}>{val}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function HowStep({ num, icon, label }: { num: string; icon: any; label: string }) {
  return (
    <View style={styles.howStep}>
      <View style={styles.howIcon}>
        <Ionicons name={icon} size={20} color="#fff" />
        <View style={styles.howNumWrap}><Text style={styles.howNum}>{num}</Text></View>
      </View>
      <Text style={styles.howLabel}>{label}</Text>
    </View>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    setError('');
    try {
      await fetch('https://famous.ai/api/crm/6a0ff3b4daa70202800085a6/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'newsletter',
          tags: ['newsletter', 'fitora-app'],
        }),
      });
      setSent(true);
      setEmail('');
    } catch (e) {
      setError('Something went wrong');
    }
  };

  return (
    <View style={styles.newsletter}>
      <Ionicons name="mail" size={28} color="#A78BFA" />
      <Text style={styles.newsTitle}>Get the latest drops</Text>
      <Text style={styles.newsSub}>Early access to new collections & AI features</Text>
      {sent ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.successText}>You're in! Check your inbox.</Text>
        </View>
      ) : (
        <View style={styles.newsForm}>
          <TextInput
            style={styles.newsInput}
            placeholder="your@email.com"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Pressable style={styles.newsBtn} onPress={submit}>
            <Text style={styles.newsBtnText}>Subscribe</Text>
          </Pressable>
        </View>
      )}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function FooterSection() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerLogo}>FITORA</Text>
      <Text style={styles.footerTag}>The future of fitting rooms is here.</Text>

      <View style={styles.footerCols}>
        <View style={styles.footerCol}>
          <Text style={styles.footerColTitle}>Product</Text>
          <Text style={styles.footerLink}>Try-On</Text>
          <Text style={styles.footerLink}>Size Guide</Text>
          <Text style={styles.footerLink}>History</Text>
        </View>
        <View style={styles.footerCol}>
          <Text style={styles.footerColTitle}>Company</Text>
          <Text style={styles.footerLink}>About</Text>
          <Text style={styles.footerLink}>Careers</Text>
          <Text style={styles.footerLink}>Press</Text>
        </View>
        <View style={styles.footerCol}>
          <Text style={styles.footerColTitle}>Legal</Text>
          <Text style={styles.footerLink}>Privacy</Text>
          <Text style={styles.footerLink}>Terms</Text>
          <Text style={styles.footerLink}>Cookies</Text>
        </View>
      </View>

      <View style={styles.footerSocial}>
        <Ionicons name="logo-instagram" size={20} color="#A78BFA" />
        <Ionicons name="logo-tiktok" size={20} color="#A78BFA" />
        <Ionicons name="logo-twitter" size={20} color="#A78BFA" />
        <Ionicons name="logo-youtube" size={20} color="#A78BFA" />
      </View>

      <Text style={styles.copyright}>© 2026 Fitora. All rights reserved.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoSmall: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  logoTag: { color: '#A78BFA', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Hero
  hero: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 280,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,4,32,0.2)' },
  heroContent: { padding: 24, gap: 12, zIndex: 2 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroBadgeText: { color: '#FBBF24', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '900', lineHeight: 36, letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20, maxWidth: 380 },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroStatVal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroStatLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  heroBlob1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(251,191,36,0.15)',
  },
  heroBlob2: {
    position: 'absolute',
    bottom: -80,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59,130,246,0.25)',
  },

  // CTA
  ctaBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#6B46C1',
    ...(Platform.OS === 'web' ? { background: 'linear-gradient(120deg, #6B46C1 0%, #3B82F6 100%)' as any } : {}),
  },
  ctaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ctaSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  // How it works
  howRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    marginTop: 20,
  },
  howStep: { alignItems: 'center', gap: 6 },
  howIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(107,70,193,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  howNumWrap: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howNum: { color: '#1A0B3D', fontSize: 10, fontWeight: '900' },
  howLabel: { color: '#D1D5DB', fontSize: 11, fontWeight: '600' },
  howLine: { flex: 1, height: 1, backgroundColor: 'rgba(167,139,250,0.3)', marginHorizontal: 4 },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    marginTop: 24,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },

  catRow: { paddingHorizontal: 20, gap: 8, marginTop: 14 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
  },
  catPillActive: { backgroundColor: '#6B46C1', borderColor: '#6B46C1' },
  catText: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },
  catTextActive: { color: '#fff' },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  sectionCount: { color: '#9CA3AF', fontSize: 12 },

  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },

  // Newsletter
  newsletter: {
    marginHorizontal: 20,
    marginTop: 32,
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(107,70,193,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    alignItems: 'center',
    gap: 6,
  },
  newsTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 6 },
  newsSub: { color: '#D1D5DB', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  newsForm: { flexDirection: 'row', gap: 8, width: '100%' },
  newsInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: '#fff',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  newsBtn: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 12,
  },
  newsBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  successText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 6 },

  // Footer
  footer: {
    marginTop: 32,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  footerLogo: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  footerTag: { color: '#9CA3AF', fontSize: 12, marginTop: 4, marginBottom: 20 },
  footerCols: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  footerCol: { gap: 6, alignItems: 'flex-start' },
  footerColTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  footerLink: { color: '#9CA3AF', fontSize: 13 },
  footerSocial: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  copyright: { color: '#6B7280', fontSize: 11 },
});
