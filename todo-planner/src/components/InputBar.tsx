import { motion } from 'framer-motion';
import { Inbox, Loader2, Mic } from 'lucide-react';
import { useState } from 'react';
import { getSettings } from '../db';
import { useKeyboardInset } from '../useKeyboardInset';
import { useVoiceRecorder } from '../useVoiceRecorder';

interface Props {
  onSend: (text: string) => Promise<void>;
  onBrainDump?: (text: string) => void;
  disabled?: boolean;
}

function InputBar({ onSend, onBrainDump, disabled = false }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const keyboardInset = useKeyboardInset();

  const voice = useVoiceRecorder({
    getPassword: async () => (await getSettings()).appPassword,
    onResult: (t) => setText(t),
  });

  const canSend = text.trim().length > 0 && !sending && !disabled;
  const voiceDisabled = disabled || sending;

  const handleSend = () => {
    const value = text.trim();
    if (!value || sending || disabled) return;
    setSending(true);
    setText('');
    onSend(value).finally(() => setSending(false));
  };

  const handleBrainDump = () => {
    const value = text.trim();
    if (!value || sending || disabled) return;
    setText('');
    onBrainDump?.(value);
  };

  const handleMicDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (voiceDisabled || voice.status !== 'idle') return;
    void voice.start();
  };

  const handleMicUp = () => {
    if (voice.status === 'recording') voice.stop();
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20"
      style={{ transform: `translateY(-${keyboardInset}px)` }}
    >
      <div
        className="mx-auto max-w-md border-t border-gray-200 bg-white/95 px-3 pt-2 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {voice.error && (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-700">
            <span className="min-w-0 flex-1">{voice.error}</span>
            <button
              type="button"
              onClick={voice.clearError}
              className="shrink-0 text-amber-500"
            >
              知道了
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="写下要做的事，或按住麦克风说话"
            disabled={disabled}
            className="min-h-[44px] flex-1 resize-none rounded-xl bg-gray-100 px-3 py-2.5 text-base leading-snug text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
            style={{ fontSize: 16 }}
          />

          <button
            type="button"
            onClick={handleBrainDump}
            disabled={!text.trim() || sending || disabled}
            aria-label="存进杂物箱"
            className="h-11 shrink-0 rounded-xl bg-gray-100 px-3 text-gray-600 transition disabled:opacity-40"
          >
            <Inbox size={18} />
          </button>

          <motion.button
            type="button"
            onPointerDown={handleMicDown}
            onPointerUp={handleMicUp}
            onPointerCancel={handleMicUp}
            onPointerLeave={handleMicUp}
            onContextMenu={(e) => e.preventDefault()}
            whileTap={{ scale: 1.05 }}
            animate={{ scale: voice.status === 'recording' ? 1.1 : 1 }}
            disabled={voiceDisabled}
            aria-label="按住说话"
            className={`relative flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl px-2 text-base font-medium transition disabled:opacity-40 ${
              voice.status === 'recording'
                ? 'bg-red-500 text-white'
                : voice.status === 'uploading'
                  ? 'bg-gray-200 text-gray-500'
                  : 'bg-gray-100 text-gray-600'
            }`}
            style={{ touchAction: 'none' }}
          >
            {voice.status === 'recording' && (
              <span className="absolute inset-0 animate-ping rounded-xl bg-red-400 opacity-40" />
            )}
            <span className="relative flex items-center gap-1">
              {voice.status === 'uploading' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Mic size={18} />
              )}
              {voice.status === 'recording' && (
                <span className="text-xs tabular-nums">{voice.elapsed}s</span>
              )}
            </span>
          </motion.button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="h-11 shrink-0 rounded-xl bg-blue-600 px-4 text-base font-medium text-white transition disabled:opacity-40"
          >
            {sending ? '…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InputBar;
