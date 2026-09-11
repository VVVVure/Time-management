import { afterEach, describe, expect, it, vi } from 'vitest';
import { callDecompose } from './decompose';

const baseReq = {
  input: '明天交报告',
  password: 'pw',
  maxMinutesPerStep: 25,
  today: '2026-09-11',
  weekday: '星期五',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('callDecompose', () => {
  it('网络不可用时返回 network 错误', async () => {
    vi.stubEnv('VITE_WORKER_URL', 'https://test-worker.dev');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const outcome = await callDecompose(baseReq);
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.errorKind).toBe('network');
      expect(outcome.message).toContain('网络不可用');
    }
  });

  it('超时时返回 timeout 错误', async () => {
    vi.stubEnv('VITE_WORKER_URL', 'https://test-worker.dev');
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const outcome = await callDecompose(baseReq);
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.errorKind).toBe('timeout');
      expect(outcome.message).toContain('20 秒');
    }
  });

  it('401 返回 unauthorized 错误并提示去设置页', async () => {
    vi.stubEnv('VITE_WORKER_URL', 'https://test-worker.dev');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: '密码错误' } }), { status: 401 }),
      ),
    );

    const outcome = await callDecompose(baseReq);
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.errorKind).toBe('unauthorized');
      expect(outcome.message).toContain('设置页');
    }
  });

  it('返回结构不符合 zod 时返回 format 错误', async () => {
    vi.stubEnv('VITE_WORKER_URL', 'https://test-worker.dev');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ wrong: true }), { status: 200 })),
    );

    const outcome = await callDecompose(baseReq);
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.errorKind).toBe('format');
      expect(outcome.message).toContain('格式不对');
    }
  });

  it('200 但 body 不是 JSON 时返回 format 错误', async () => {
    vi.stubEnv('VITE_WORKER_URL', 'https://test-worker.dev');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not json', { status: 200 })),
    );

    const outcome = await callDecompose(baseReq);
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.errorKind).toBe('format');
    }
  });

  it('正常返回 tasks', async () => {
    vi.stubEnv('VITE_WORKER_URL', 'https://test-worker.dev');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            tasks: [
              {
                title: '完成报告',
                deadline: '2026-09-12',
                time: null,
                priority: 'high',
                steps: [{ title: '写初稿', estimatedMinutes: 25, energy: 'high' }],
              },
            ],
            question: null,
          }),
          { status: 200 },
        ),
      ),
    );

    const outcome = await callDecompose(baseReq);
    expect(outcome.kind).toBe('ok');
    if (outcome.kind === 'ok' && outcome.result.kind === 'tasks') {
      expect(outcome.result.tasks).toHaveLength(1);
      expect(outcome.result.tasks[0].title).toBe('完成报告');
    }
  });

  it('返回追问问题', async () => {
    vi.stubEnv('VITE_WORKER_URL', 'https://test-worker.dev');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ tasks: [], question: '具体是什么？' }), { status: 200 }),
      ),
    );

    const outcome = await callDecompose(baseReq);
    expect(outcome.kind).toBe('ok');
    if (outcome.kind === 'ok' && outcome.result.kind === 'question') {
      expect(outcome.result.question).toBe('具体是什么？');
    }
  });
});
