import type { Env } from '../index';
import { corsHeaders, errorJson, json } from '../http';

const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_AUDIO_SIZE = 15 * 1024 * 1024; // 15MB

export async function handleTranscribe(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorJson('BAD_REQUEST', '请求必须是 multipart/form-data', 400, cors);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return errorJson('BAD_REQUEST', '缺少音频文件（file 字段）', 400, cors);
  }
  if (file.size === 0) {
    return errorJson('BAD_REQUEST', '音频文件为空，请重新录制', 400, cors);
  }
  if (file.size > MAX_AUDIO_SIZE) {
    return errorJson('FILE_TOO_LARGE', '音频文件超过 15MB，请录短一点', 400, cors);
  }

  const upstream = new FormData();
  upstream.append('file', file, file.name || 'recording.webm');
  upstream.append('model', env.TRANSCRIBE_MODEL || 'whisper-1');

  const res = await fetch(OPENAI_TRANSCRIBE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: upstream,
  });

  if (!res.ok) {
    // 不把上游原始报错细节透露给前端，只打到 Worker 日志里用于排障
    const status = res.status;
    const body = await res.text();
    console.error(`[upstream] OpenAI HTTP ${status}: ${body}`);
    throw new Error('UPSTREAM_ERROR');
  }

  const data = (await res.json()) as { text?: unknown };
  if (typeof data.text !== 'string') {
    return errorJson('AI_FORMAT_ERROR', '转写结果格式不对，请稍后再试', 502, cors);
  }
  return json({ text: data.text }, 200, cors);
}
