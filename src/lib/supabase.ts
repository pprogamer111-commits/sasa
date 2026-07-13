/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { User, Message } from '../types';


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Safely initialize Supabase to prevent app crashes on missing keys
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// --- SCHEMA MAPPER HELPERS ---

export const mapProfileToUser = (profile: any): User => {
  return {
    id: profile.id,
    username: profile.username || 'unknown',
    name: profile.name || profile.username || 'Unknown Explorer',
    avatarSeed: profile.avatar_seed || 'default',
    status: (profile.status as 'online' | 'offline') || 'offline',
    bio: profile.bio || '',
    isAI: profile.is_ai || false,
  };
};

export const mapMessageToType = (msg: any): Message => {
  return {
    id: msg.id,
    senderId: msg.sender_id,
    recipientId: msg.recipient_id,
    text: msg.text,
    timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp).getTime() : Number(msg.timestamp),
  };
};

// --- CORE SERVICE FUNCTIONS ---

// Update User Status
export const updateUserStatus = async (userId: string, status: 'online' | 'offline') => {
  if (!supabase) return;
  try {
    await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId);
  } catch (err) {
    console.error('Failed to update user presence status in database:', err);
  }
};

// Create Profile Fallback (if trigger isn't configured in Supabase dashboard)
export const ensureProfileExists = async (
  userId: string,
  username: string,
  name: string,
  avatarSeed: string,
  bio: string
): Promise<User> => {
  if (!supabase) throw new Error('Supabase is not configured');

  const { data: existing, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existing && !fetchErr) {
    return mapProfileToUser(existing);
  }

  // Insert profile if missing
  const { data: created, error: insertErr } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: username.toLowerCase().trim(),
      name: name || username,
      avatar_seed: avatarSeed,
      bio: bio || 'Explorer of the glowing grid.',
      status: 'online',
    })
    .select('*')
    .single();

  if (insertErr || !created) {
    console.warn('Profile creation fallback warning (might be handled by SQL trigger):', insertErr);
    // Return a constructed local model if insert fails
    return {
      id: userId,
      username,
      name,
      avatarSeed,
      bio,
      status: 'online',
    };
  }

  return mapProfileToUser(created);
};
