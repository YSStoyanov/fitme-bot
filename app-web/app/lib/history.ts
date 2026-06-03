import { supabase } from './supabase';
import { Platform } from 'react-native';

export type HistoryRow = {
  id: string;
  date: string;
  clothingName: string;
  category: string;
  resultImage: string;
  personImage?: string | null;
  clothingImageUrl?: string | null;
  size: string;
  confidence: number;
  fit: string;
  reasoning?: string | null;
  alternativeSize?: string | null;
  fitNote?: string | null;
};

const SESSION_KEY = 'fitora_session_id';

let cachedSessionId: string | null = null;

export function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      let id = window.localStorage.getItem(SESSION_KEY);
      if (!id) {
        id = generateId();
        window.localStorage.setItem(SESSION_KEY, id);
      }
      cachedSessionId = id;
      return id;
    }
  } catch {}
  cachedSessionId = generateId();
  return cachedSessionId;
}

function generateId(): string {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

export async function saveHistoryItem(item: {
  clothingName: string;
  category: string;
  resultImage: string;
  personImage?: string;
  clothingImageUrl?: string;
  size: string;
  confidence: number;
  fit: string;
  reasoning?: string;
  alternativeSize?: string;
  fitNote?: string;
}): Promise<HistoryRow | null> {
  const sessionId = getSessionId();

  // Only persist remote URLs for person/clothing (avoid massive data URLs in DB)
  const personUrl = item.personImage && item.personImage.startsWith('http') ? item.personImage : null;
  const clothingUrl = item.clothingImageUrl && item.clothingImageUrl.startsWith('http') ? item.clothingImageUrl : null;

  const { data, error } = await supabase
    .from('try_on_history')
    .insert({
      session_id: sessionId,
      clothing_name: item.clothingName,
      clothing_category: item.category,
      result_image_url: item.resultImage,
      person_image_url: personUrl,
      clothing_image_url: clothingUrl,
      recommended_size: item.size,
      confidence: item.confidence,
      fit: item.fit,
      reasoning: item.reasoning || null,
      alternative_size: item.alternativeSize || null,
      fit_note: item.fitNote || null,
    })
    .select()
    .single();

  if (error) {
    console.error('saveHistoryItem error:', error);
    return null;
  }

  return rowToHistory(data);
}

export async function fetchHistory(): Promise<HistoryRow[]> {
  const sessionId = getSessionId();
  const { data, error } = await supabase
    .from('try_on_history')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('fetchHistory error:', error);
    return [];
  }
  return (data || []).map(rowToHistory);
}

export async function deleteHistoryItem(id: string): Promise<boolean> {
  const { error } = await supabase.from('try_on_history').delete().eq('id', id);
  if (error) {
    console.error('deleteHistoryItem error:', error);
    return false;
  }
  return true;
}

function rowToHistory(row: any): HistoryRow {
  return {
    id: String(row.id),
    date: new Date(row.created_at).toLocaleString(),
    clothingName: row.clothing_name || 'Item',
    category: row.clothing_category || 'custom',
    resultImage: row.result_image_url,
    personImage: row.person_image_url,
    clothingImageUrl: row.clothing_image_url,
    size: row.recommended_size || 'M',
    confidence: row.confidence ?? 85,
    fit: row.fit || 'regular',
    reasoning: row.reasoning,
    alternativeSize: row.alternative_size,
    fitNote: row.fit_note,
  };
}
