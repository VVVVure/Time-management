import { checkAuth, corsHeaders, errorJson } from './http';
import { handleDecompose } from './routes/decompose';
import { handleRefine } from './routes/refine';
import { handleTranscribe } from './routes/transcribe';

export interface Env {
  /** 前端访问密码（secret） */
  APP_PASSWORD: string;
  /** Anthropic API key（secret，绝不返回给前端） */
  ANTHROPIC_API_KEY: string;
  /** 调用 Claude 的模型名，例如 claude-3-5-haiku-latest */
  MODEL: string;
  /** OpenAI API key（secret，用于语音转文字，绝不返回给前端） */
  OPENAI_API_KEY: string;
  /** 语音转文字模型名，例如 whisper-1 */
  TRANSCRIBE_MODEL: string;
  /** 允许的前端域名，逗号分隔；本地开发允许 localhost */
  ALLOWED_ORIGIN?: string;
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') {
    return errorJson('METHOD_NOT_ALLOWED', '只支持 POST 请求', 405, cors);
  }

  if (!checkAuth(request, env)) {
    return errorJson('UNAUTHORIZED', '密码错误，请在设置页检查 App 密码', 401, cors);
  }

  const url = new URL(request.url);
  try {
    if (url.pathname === '/decompose') return await handleDecompose(request, env);
    if (url.pathname === '/refine') return await handleRefine(request, env);
    if (url.pathname === '/transcribe') return await handleTranscribe(request, env);
    return errorJson('NOT_FOUND', '接口不存在', 404, cors);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'UPSTREAM_ERROR') {
      return errorJson('AI_ERROR', 'AI 服务暂时不可用，请稍后再试', 502, cors);
    }
    if (message === 'NO_TOOL_USE') {
      return errorJson('AI_FORMAT_ERROR', 'AI 返回格式不对，请稍后再试', 502, cors);
    }
    return errorJson('INTERNAL', '服务器内部错误', 500, cors);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
