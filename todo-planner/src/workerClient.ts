export type WorkerErrorKind = 'network' | 'timeout' | 'unauthorized' | 'format' | 'server';

export interface WorkerFetchOptions {
  password: string;
  json?: unknown;
  form?: FormData;
  timeoutMessage?: string;
  parseFailMessage?: string;
  serverFallbackMessage?: string;
}

export type WorkerFetchOutcome =
  | { kind: 'ok'; data: unknown }
  | { kind: 'error'; errorKind: WorkerErrorKind; message: string };

const TIMEOUT_MS = 20_000;

/** 统一的 Worker 调用封装：workerUrl 解析、鉴权头、20 秒超时、常见错误分类 */
export async function workerFetch(
  path: string,
  options: WorkerFetchOptions,
): Promise<WorkerFetchOutcome> {
  const workerUrl = String(import.meta.env.VITE_WORKER_URL ?? '').replace(/\/+$/, '');
  if (!workerUrl) {
    return {
      kind: 'error',
      errorKind: 'server',
      message: '未配置 Worker 地址（VITE_WORKER_URL），请检查 .env.local',
    };
  }

  const headers: Record<string, string> = { 'X-App-Password': options.password };
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.json);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${workerUrl}${path}`, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as { name?: string })?.name === 'AbortError') {
      return {
        kind: 'error',
        errorKind: 'timeout',
        message: options.timeoutMessage ?? '请求超时（超过 20 秒），请重试',
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
      message: options.parseFailMessage ?? 'AI 返回的内容无法解析，请重试',
    };
  }

  if (!res.ok) {
    const message = (data as { error?: { message?: string } })?.error?.message;
    return {
      kind: 'error',
      errorKind: 'server',
      message: message ?? options.serverFallbackMessage ?? 'AI 服务暂时不可用，请稍后再试',
    };
  }

  return { kind: 'ok', data };
}
