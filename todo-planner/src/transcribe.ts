import { z } from 'zod';

const transcribeResponseSchema = z.object({
  text: z.string(),
});

export type TranscribeErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'format'
  | 'server'
  | 'empty';

export type TranscribeOutcome =
  | { kind: 'ok'; text: string }
  | { kind: 'error'; errorKind: TranscribeErrorKind; message: string };

const TIMEOUT_MS = 20_000;

/** 上传音频到 Worker 的 /transcribe 接口，返回统一结果，不抛异常 */
export async function callTranscribe(audio: Blob, password: string): Promise<TranscribeOutcome> {
  const workerUrl = String(import.meta.env.VITE_WORKER_URL ?? '').replace(/\/+$/, '');
  if (!workerUrl) {
    return {
      kind: 'error',
      errorKind: 'server',
      message: '未配置 Worker 地址（VITE_WORKER_URL），请检查 .env.local',
    };
  }
  if (!password) {
    return {
      kind: 'error',
      errorKind: 'unauthorized',
      message: '还没有设置 App 密码，请先到设置页填写',
    };
  }

  const form = new FormData();
  const extension = audio.type === 'audio/mp4' ? 'm4a' : 'webm';
  form.append('file', audio, `recording.${extension}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${workerUrl}/transcribe`, {
      method: 'POST',
      headers: { 'X-App-Password': password },
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as { name?: string })?.name === 'AbortError') {
      return {
        kind: 'error',
        errorKind: 'timeout',
        message: '转写超时（超过 20 秒），请重试',
      };
    }
    return {
      kind: 'error',
      errorKind: 'network',
      message: '网络不可用，请检查网络连接后重试',
    };
  }
  clearTimeout(timer);

  if (res.status === 401) {
    return {
      kind: 'error',
      errorKind: 'unauthorized',
      message: '密码错误，请到设置页检查 App 密码',
    };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return {
      kind: 'error',
      errorKind: 'format',
      message: '转写服务返回异常，请重试',
    };
  }

  if (!res.ok) {
    const message = (data as { error?: { message?: string } })?.error?.message;
    return {
      kind: 'error',
      errorKind: 'server',
      message: message ?? '转写服务暂时不可用，请稍后再试',
    };
  }

  const parsed = transcribeResponseSchema.safeParse(data);
  if (!parsed.success) {
    return {
      kind: 'error',
      errorKind: 'format',
      message: '转写结果格式不对，请重试',
    };
  }
  const text = parsed.data.text.trim();
  if (!text) {
    return {
      kind: 'error',
      errorKind: 'empty',
      message: '没有识别到内容，请再试一次',
    };
  }
  return { kind: 'ok', text };
}
