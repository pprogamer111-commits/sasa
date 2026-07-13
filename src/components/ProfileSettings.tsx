import React, { useState } from 'react';
import { User } from '../types';
import { X, Save, ShieldAlert, BadgeInfo } from 'lucide-react';

interface ProfileSettingsProps {
  currentUser: User;
  onUpdate: (name: string, bio: string, avatarSeed: string) => Promise<void>;
  onClose: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  currentUser,
  onUpdate,
  onClose
}) => {
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarSeed, setAvatarSeed] = useState(currentUser.avatarSeed);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await onUpdate(name.trim() || currentUser.username, bio.trim(), avatarSeed);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const regenerateSeed = () => {
    setAvatarSeed(`node-${Math.floor(Math.random() * 9000 + 1000)}`);
  };

  return (
    <div className="fixed inset-0 bg-[#08080A]/85 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#09090D]/95 border border-white/10 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-display font-medium text-white shadow-glow-cyan">Security & Node Specs</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${avatarSeed}`}
                    alt="Holo avatar"
                    className="w-16 h-16 group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={regenerateSeed}
                className="absolute -bottom-2 -right-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] px-2 py-1 rounded-md font-mono transition-colors shadow-lg font-semibold"
              >
                ROLL
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-mono uppercase mb-1.5">
              Node Call Sign (Display Name)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-black/40 border border-white/10 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 rounded-xl py-2 px-3 text-sm text-white outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-mono uppercase mb-1.5">
              User ID Terminal Sequence
            </label>
            <input
              type="text"
              value={currentUser.id}
              disabled
              className="w-full bg-black/20 border border-white/5 text-slate-500 font-mono text-xs rounded-xl py-2 px-3 outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-mono uppercase mb-1.5">
              Network Bio / Broadcast Message
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Broadcasting quantum waves..."
              className="w-full bg-black/40 border border-white/10 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 rounded-xl py-2 px-3 text-sm text-white outline-none transition-all resize-none"
            />
          </div>

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
              <BadgeInfo className="w-4 h-4 shrink-0" />
              Profile updated. Broadcasted to the network mesh.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium py-2.5 px-4 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-medium py-2.5 px-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-cyan-400 rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
