import React, { useState } from 'react';
import { ThreeDCard } from './ThreeDCard';
import { Shield, Sparkles, User, FileText, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';


interface RegisterFormProps {
  onAuth: (
    username: string, 
    password: string, 
    action: 'login' | 'register', 
    name?: string, 
    bio?: string, 
    avatarSeed?: string
  ) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  useSupabase?: boolean;
  supabaseError?: string | null;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onAuth, isLoading, useSupabase, supabaseError }) => {
  const [action, setAction] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(() => `node-${Math.floor(Math.random() * 900 + 100)}`);
  const [error, setError] = useState('');

  const avatarStyles = [
    { name: 'Amethyst', seed: 'node-amethyst' },
    { name: 'Emerald', seed: 'node-emerald' },
    { name: 'Sapphire', seed: 'node-sapphire' },
    { name: 'Obsidian', seed: 'node-obsidian' },
    { name: 'Ruby', seed: 'node-ruby' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setError('Please input a terminal username');
      return;
    }
    if (cleanUser.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!password) {
      setError('Please enter your secure access password');
      return;
    }
    if (action === 'register' && password.length < 5) {
      setError('Password must be at least 5 characters');
      return;
    }

    const cleanName = name.trim() || username.trim();
    try {
      const res = await onAuth(cleanUser, password, action, cleanName, bio.trim(), avatarSeed);
      if (res && !res.success) {
        setError(res.error || 'Connection handshake failed');
      }
    } catch (err: any) {
      setError(err.message || 'Mesh link error occurred');
    }
  };

  const cycleAvatar = () => {
    const randomIdx = Math.floor(Math.random() * avatarStyles.length);
    const selected = avatarStyles[randomIdx];
    setAvatarSeed(`${selected.seed}-${Math.floor(Math.random() * 1000)}`);
  };

  // Supabase is optional on Render because Express serves the API.
  const isProdMissingKeys = false;

  if (isProdMissingKeys) {
    return (
      <div className="w-full max-w-md mx-auto px-4 z-10" id="register-container">
        <ThreeDCard className="p-8 border-red-500/20 rounded-3xl bg-[#09090D]/80 backdrop-blur-2xl" glowColor="rgba(239,68,68,0.2)">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] mb-4">
              <Shield className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="text-xl font-display font-semibold tracking-tight text-white mb-2 shadow-glow-red">
              Supabase Keys Required
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed">
              This application is built for production on Netlify and relies on Supabase for authentication, profile syncing, and real-time mesh messaging.
            </p>
          </div>

          <div className="space-y-4 border-t border-white/10 pt-4 font-sans text-xs">
            <div className="p-3.5 rounded-xl bg-slate-500/5 border border-white/10">
              <p className="text-slate-300 font-medium mb-1.5 uppercase font-mono tracking-wider text-[10px]">Required Environment Variables</p>
              <div className="space-y-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-red-400 font-mono text-[10px]">VITE_SUPABASE_URL</span>
                  <span className="text-slate-500 text-[10px]">Your Supabase API URL endpoint</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-red-400 font-mono text-[10px]">VITE_SUPABASE_ANON_KEY</span>
                  <span className="text-slate-500 text-[10px]">Your Supabase client anon public key</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
              <p className="text-cyan-400 font-medium mb-1.5 uppercase font-mono tracking-wider text-[10px]">Netlify Setup Instructions</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed text-[11px]">
                <li>Go to your <strong className="text-slate-300">Netlify Dashboard</strong></li>
                <li>Navigate to <strong className="text-slate-300">Site Configuration &gt; Environment variables</strong></li>
                <li>Add the two variables listed above</li>
                <li>Trigger a <strong className="text-slate-300">redeploy</strong> of your site</li>
              </ol>
            </div>
          </div>
        </ThreeDCard>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 z-10" id="register-container">
      <ThreeDCard className="p-8 border-white/10 rounded-3xl bg-[#09090D]/80 backdrop-blur-2xl" glowColor="rgba(6,182,212,0.3)">
        
        {/* Sync vs Generate Dual Tabs */}
        <div className="flex border-b border-white/15 mb-6 gap-2">
          <button
            type="button"
            onClick={() => {
              setAction('login');
              setError('');
            }}
            className={`flex-1 pb-3 text-center text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
              action === 'login'
                ? 'border-cyan-400 text-cyan-400 shadow-[inset_0_-10px_10px_-10px_rgba(6,182,212,0.3)]'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Sync Node (Log In)
          </button>
          <button
            type="button"
            onClick={() => {
              setAction('register');
              setError('');
            }}
            className={`flex-1 pb-3 text-center text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
              action === 'register'
                ? 'border-cyan-400 text-cyan-400 shadow-[inset_0_-10px_10px_-10px_rgba(6,182,212,0.3)]'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Generate Node (Register)
          </button>
        </div>

        <div className="text-center mb-6">
          {useSupabase ? (
            <div className="flex flex-col items-center gap-1.5 text-center py-2 px-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-[10px] font-mono mx-auto w-fit mb-4">
              <div className="flex items-center gap-1.5 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399] animate-pulse" />
                Supabase Cloud Active
              </div>
              {supabaseError && (
                <div className="flex flex-col gap-1 text-[9px] text-red-400/90 font-mono max-w-[280px] mt-1 border-t border-red-500/10 pt-1">
                  <span className="font-semibold uppercase text-[8px] tracking-wider">Database Setup Warning:</span>
                  <span className="break-all">{supabaseError}</span>
                  <span className="text-slate-400 font-sans mt-0.5 leading-normal">
                    Please make sure to run the SQL query from <code className="bg-slate-800 text-slate-200 px-1 rounded select-all font-mono">supabase_schema.sql</code> in your Supabase SQL Editor to create the necessary tables.
                  </span>
                </div>
              )}
            </div>
          ) : isSupabaseConfigured ? (
            <div className="flex flex-col items-center gap-1 text-center py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono mx-auto w-fit mb-4">
              <div className="flex items-center gap-1.5 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_#fbbf24] animate-pulse" />
                Local Fallback Active
              </div>
              <span className="text-[9px] text-slate-400 font-sans max-w-[280px]">
                Supabase credentials found, but connection failed or tables are missing. Safe local fallback is active.
              </span>
              {supabaseError && (
                <span className="text-[8px] text-red-400/80 font-mono mt-0.5 max-w-[280px] break-all">
                  Error: {supabaseError}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-center py-2 px-3 rounded-xl bg-slate-500/5 border border-slate-500/15 text-slate-400 text-[10px] font-mono mx-auto w-fit mb-4">
              <div className="flex items-center gap-1.5 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shadow-[0_0_5px_#94a3b8] animate-pulse" />
                Local Emulation Mode
              </div>
              <span className="text-[9px] text-slate-500 select-all">Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY to unlock cloud db</span>
            </div>
          )}

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)] mb-4">
            {action === 'login' ? (
              <KeyRound className="w-7 h-7 text-cyan-400" />
            ) : (
              <Shield className="w-7 h-7 text-cyan-400" />
            )}
          </div>
          <h1 className="text-xl font-display font-semibold tracking-tight text-white mb-2 shadow-glow-cyan">
            {action === 'login' ? 'Sync with Luminal Grid' : 'Establish Luminal Link'}
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed">
            {action === 'login' 
              ? 'Provide your registered terminal password to enter' 
              : 'Enter unique credentials to register onto the premium cyber mesh'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl animate-shake">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1.5">
              Terminal Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/70" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. neophyte_99"
                disabled={isLoading}
                className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1.5">
              Access Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/70" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
              />
            </div>
          </div>

          {action === 'register' && (
            <>
              <div>
                <label className="block text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1.5">
                  Display Name (Optional)
                </label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/70" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex"
                    disabled={isLoading}
                    className="w-full bg-black/40 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1.5">
                  Network Bio / Status (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-indigo-400/70" />
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Exploring the glowing quantum mesh..."
                    disabled={isLoading}
                    rows={2}
                    className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all resize-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
                  />
                </div>
              </div>

              {/* Avatar Holographic Generator */}
              <div className="bg-black/30 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${avatarSeed}`}
                        alt="Holo avatar"
                        className="w-9 h-9"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">Holo Avatar Seed</p>
                    <p className="text-slate-500 text-[10px] font-mono select-all">{avatarSeed}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cycleAvatar}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-mono border border-cyan-500/20 hover:border-cyan-500/40 px-2.5 py-1.5 rounded-lg bg-cyan-500/5 transition-all"
                >
                  Regenerate
                </button>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full group mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-cyan-400 rounded-full animate-spin" />
                Interfacing Network...
              </span>
            ) : (
              <>
                {action === 'login' ? 'Synchronize Node' : 'Initialize Handshake'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </ThreeDCard>
    </div>
  );
};
