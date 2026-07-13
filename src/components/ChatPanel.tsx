import React, { useState, useRef, useEffect } from 'react';
import { User, Message } from '../types';
import { Send, Sparkles, Tv, MessageSquare, Flame, Smile } from 'lucide-react';

interface ChatPanelProps {
  currentUser: User;
  contact: User;
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
  onStartCall: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  currentUser,
  contact,
  messages,
  isTyping,
  onSendMessage,
  onStartCall
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const EMOJIS = [
    '😀', '😂', '😍', '👍', '🔥', '🚀', '✨', '💻', 
    '❤️', '👀', '🎉', '🌟', '🤖', '🛸', '🪐', '💡',
    '👏', '👋', '🙏', '💯', '🤔', '😎', '💀', '👾',
    '⚡', '🌈', '🌍', '💥', '🎈', '🎵', '💔', '🔮'
  ];

  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-black/40 border border-white/10 rounded-3xl backdrop-blur-xl overflow-hidden" id="chat-panel">
      {/* Contact Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-11 h-11 rounded-xl p-0.5 bg-gradient-to-tr ${
              contact.status === 'online' ? 'from-cyan-400 to-indigo-600' : 'from-slate-700 to-slate-800'
            }`}>
              <div className="w-full h-full bg-[#08080A] rounded-[10px] flex items-center justify-center overflow-hidden">
                <img
                  src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${contact.avatarSeed}`}
                  alt={contact.name}
                  className="w-8 h-8"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            {/* Online Indicator */}
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#08080A] ${
              contact.status === 'online' ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-600'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium text-white">{contact.name}</h3>
              {contact.isAI && (
                <span className="bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-400 font-mono px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Core Bot
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs truncate max-w-xs md:max-w-md">
              {contact.bio || 'Ready for glowing connection.'}
            </p>
          </div>
        </div>

        {/* Video Call Trigger */}
        <button
          onClick={onStartCall}
          className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500 border border-cyan-500/30 hover:border-cyan-500 hover:text-slate-950 text-cyan-400 text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-103 font-medium"
        >
          <Tv className="w-4 h-4" />
          <span className="hidden sm:inline">Holo Video Call</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent"
        style={{ contentVisibility: 'auto' }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <MessageSquare className="w-12 h-12 text-cyan-500/40 mb-3 animate-pulse" />
            <p className="text-slate-300 text-sm font-medium shadow-glow-cyan">No transmissions on this secure line</p>
            <p className="text-slate-500 text-xs mt-1">Send a message to initiate handshake</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUser.id;
            return (
              <div
                key={m.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[80%] flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Small avatar */}
                  <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-slate-950 border border-white/10">
                    <img
                      src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${
                        isMe ? currentUser.avatarSeed : contact.avatarSeed
                      }`}
                      alt="Avatar"
                      className="w-full h-full"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-br from-cyan-500 to-indigo-600 text-white rounded-tr-none shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                          : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none backdrop-blur-md'
                      }`}
                    >
                      {m.text}
                    </div>
                    <p className={`text-[10px] font-mono text-slate-600 ${isMe ? 'text-right' : 'text-left'}`}>
                      {formatTime(m.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-2.5 items-center">
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-slate-950 border border-white/10">
                <img
                  src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${contact.avatarSeed}`}
                  alt="Avatar"
                  className="w-full h-full"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Compose Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-black/30 flex gap-2 relative">
        {showEmojiPicker && (
          <div 
            ref={emojiPickerRef}
            className="absolute bottom-18 right-4 w-64 bg-[#09090D]/95 border border-white/10 hover:border-cyan-500/30 rounded-2xl p-3 shadow-[0_0_25px_rgba(6,182,212,0.15)] backdrop-blur-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <p className="text-[10px] font-mono text-cyan-400/80 mb-2 uppercase tracking-wider">Select Signal Glyph</p>
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-lg hover:bg-white/5 active:bg-white/10 p-1 rounded-lg transition-all cursor-pointer text-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Broadcast securely to ${contact.name}...`}
          className="flex-1 bg-black/40 border border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
        />
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
            showEmojiPicker 
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title="Glyph Matrix (Emojis)"
        >
          <Smile className="w-4 h-4" />
        </button>
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-gradient-to-r from-cyan-500 to-indigo-600 text-white p-2.5 rounded-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none hover:scale-103 active:scale-97"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
