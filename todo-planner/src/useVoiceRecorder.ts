import { useCallback, useEffect, useRef, useState } from 'react';
import { callTranscribe } from './transcribe';

export type VoiceStatus = 'idle' | 'recording' | 'uploading';

interface Options {
  /** 每次开始录音时读取最新密码（不缓存，避免设置页改完密码后用到旧值） */
  getPassword: () => Promise<string>;
  /** 转写成功后回调（填入输入框，不自动发送） */
  onResult: (text: string) => void;
}

const MAX_RECORD_SECONDS = 60;

function pickMimeType(): string {
  const candidates = ['audio/mp4', 'audio/webm'];
  for (const type of candidates) {
    try {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {
      // 忽略
    }
  }
  return '';
}

export function useVoiceRecorder({ getPassword, onResult }: Options) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef('');
  const tickRef = useRef<number | null>(null);
  const maxRef = useRef<number | null>(null);
  const passwordRef = useRef('');
  const startingRef = useRef(false);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const clearTimers = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (maxRef.current !== null) {
      window.clearTimeout(maxRef.current);
      maxRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  const finish = useCallback(
    async (blob: Blob) => {
      setStatus('uploading');
      setError(null);
      const outcome = await callTranscribe(blob, passwordRef.current);
      if (outcome.kind === 'ok') {
        setStatus('idle');
        onResultRef.current(outcome.text);
      } else {
        setError(outcome.message);
        setStatus('idle');
      }
    },
    [],
  );

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    clearTimers();

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeRef.current || 'audio/webm',
      });
      chunksRef.current = [];
      releaseStream();
      if (blob.size === 0) {
        setStatus('idle');
        setError('没有录到声音，请按住麦克风再说一次');
        return;
      }
      void finish(blob);
    };

    recorder.stop();
    setStatus('uploading');
  }, [clearTimers, releaseStream, finish]);

  const start = useCallback(async () => {
    setError(null);

    if (recorderRef.current || startingRef.current) return;
    startingRef.current = true;

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      startingRef.current = false;
      setError('当前浏览器不支持录音，请用键盘输入（Safari 需要在 HTTPS 下使用）');
      return;
    }

    const password = await getPassword();
    if (!password) {
      startingRef.current = false;
      setError('还没有设置 App 密码，请先到设置页填写');
      return;
    }
    passwordRef.current = password;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeRef.current = mimeType;

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      setStatus('recording');
      setElapsed(0);

      tickRef.current = window.setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);

      maxRef.current = window.setTimeout(() => {
        stop();
      }, MAX_RECORD_SECONDS * 1000);
      startingRef.current = false;
    } catch (err) {
      startingRef.current = false;
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('麦克风权限被拒绝，请在系统设置里允许访问');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('没有检测到麦克风设备');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError('麦克风被其他应用占用，请稍后再试');
      } else {
        setError('无法访问麦克风，请检查浏览器设置');
      }
      releaseStream();
      clearTimers();
    }
  }, [getPassword, stop, releaseStream, clearTimers]);

  // 卸载时清理，避免录音/计时器泄漏
  useEffect(() => {
    return () => {
      clearTimers();
      releaseStream();
    };
  }, [clearTimers, releaseStream]);

  return {
    status,
    elapsed,
    error,
    start,
    stop,
    clearError: () => setError(null),
  };
}
