import { useState } from 'react';
import { useKeyboardInset } from '../useKeyboardInset';

interface Props {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

function InputBar({ onSend, disabled = false }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const keyboardInset = useKeyboardInset();

  const canSend = text.trim().length > 0 && !sending && !disabled;

  const handleSend = () => {
    const value = text.trim();
    if (!value || sending || disabled) return;
    setSending(true);
    setText('');
    onSend(value).finally(() => setSending(false));
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
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="写下要做的事，或点键盘上的麦克风说话"
            disabled={disabled}
            className="min-h-[44px] flex-1 resize-none rounded-xl bg-gray-100 px-3 py-2.5 text-base leading-snug text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
            style={{ fontSize: 16 }}
          />
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
