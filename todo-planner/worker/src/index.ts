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

const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_INPUT_LENGTH = 2000;
const MAX_AUDIO_SIZE = 15 * 1024 * 1024; // 15MB

const SYSTEM_PROMPT = `你是一个时间规划助手，负责把用户输入整理成任务和可执行的小步骤。

规则：
1. 一句话可能包含多件事，但如果是同一次出行/同一件事里的连续几站（例如"接了Ryan再去接林紫樱"），只拆成一个任务，用步骤表示各站；只有明显不相关的独立事情才拆成多个任务。
2. 语音听写的文字不规范，可能有口头禅、同音错字、没有标点。先理解意图，再整理成干净的标题，不要照抄原话。
3. 步骤要"坐下就能开始做"。每个步骤以动词开头，内容具体；单个步骤的预估时间不超过用户给定的每步最长分钟数，超过就继续拆。
4. 步骤数量合理。每个任务 1 到 8 步；任何情况下每个任务的 steps 都不能是空数组，哪怕最简单的一件事也要至少 1 步；简单的事只拆 1 步，不要硬拆；特别大的目标只拆第一周能做的具体步骤。
5. 破冰步。每个任务的第一步必须是门槛极低的启动动作，预估时间不超过 5 分钟，动作具体到"伸手就能做"的程度（例如"完成 UX 报告"的第一步不是"读作业要求（15分钟）"，而是"打开电脑，新建一个叫 UX调研 的文档（3分钟）"）；第二步开始可以正常拆解。真正的单一微小动作（如"取快递""给妈妈打电话"）本来就该是 1 步，不用刻意再拆出一个更短的破冰步。
6. 日期换算。根据用户给的"今天日期"和"星期几"，把"明天""这周末""下周五"换算成具体日期，填到 deadline（YYYY-MM-DD）；有歧义按最常见理解处理；没提到日期就填 null，不要编造。
7. 时间提取。如果输入里提到具体时间点（"11点15""下午3点""晚上7点"这种），把时间提取到 time 字段（HH:MM，24 小时制），不要把时间信息留在 title 或 deadline 里；没提到具体时间点就填 null。
8. 精力消耗。给每个步骤判断精力消耗并填 energy：需要深度思考/创造性投入的（如"写结论""分析数据"）填 high；机械性/体力性的简单动作（如"倒垃圾""发一封确认邮件""打电话约时间"）填 low；不确定的填 null。
9. 优先级。用户明确表达紧急或重要时填 high，明确说不急时填 low，其他情况一律 medium。
10. 信息太模糊时不要猜（例如"搞一下那个东西"）。此时不返回任务，改为返回一个追问问题。
11. 只通过调用工具返回结果，不要输出任何其他文字。`;

function json(data: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function errorJson(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return json({ error: { code, message } }, status, headers);
}

function isLocalhostOrigin(origin: string): boolean {
  return (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin === 'http://localhost' ||
    origin === 'http://127.0.0.1'
  );
}

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (!origin) return {};
  const allowed = allowedOrigins(env);
  if (!allowed.includes(origin) && !isLocalhostOrigin(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Password',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function checkAuth(request: Request, env: Env): boolean {
  return (
    Boolean(env.APP_PASSWORD) && request.headers.get('X-App-Password') === env.APP_PASSWORD
  );
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function extractToolInput(data: unknown, toolName: string): unknown {
  const content = (data as { content?: unknown })?.content;
  if (!Array.isArray(content)) throw new Error('NO_TOOL_USE');
  for (const block of content) {
    const b = block as { type?: string; name?: string; input?: unknown };
    if (b.type === 'tool_use' && b.name === toolName) return b.input;
  }
  throw new Error('NO_TOOL_USE');
}

async function callClaude(
  env: Env,
  tool: unknown,
  userText: string,
): Promise<unknown> {
  const res = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: env.MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [tool],
      tool_choice: { type: 'tool', name: (tool as { name: string }).name },
      messages: [{ role: 'user', content: userText }],
    }),
  });

  if (!res.ok) {
    // 不把上游原始报错细节透露给前端，只打到 Worker 日志里用于排障
    const status = res.status;
    const body = await res.text();
    console.error(`[upstream] Anthropic HTTP ${status}: ${body}`);
    throw new Error('UPSTREAM_ERROR');
  }
  return res.json();
}

const decomposeTool = {
  name: 'return_decompose_result',
  description: '返回拆解后的任务列表；信息太模糊时返回追问问题',
  input_schema: {
    type: 'object',
    properties: {
      question: {
        type: ['string', 'null'],
        description: '信息太模糊需要追问时返回问题，否则为 null',
      },
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '简洁的任务标题' },
            deadline: {
              type: ['string', 'null'],
              description: '截止日期 YYYY-MM-DD，没提到就是 null',
            },
            time: {
              type: ['string', 'null'],
              description:
                '具体时间点 HH:MM（24 小时制），如提到"11点15分""下午3点"这类就填，没提到就是 null',
            },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: '动词开头的具体动作' },
                  estimatedMinutes: { type: 'number', description: '预估分钟数' },
                  energy: {
                    type: ['string', 'null'],
                    enum: ['high', 'low', null],
                    description:
                      '精力消耗：high=需要深度思考/创造性投入，low=机械/体力性简单动作，不确定为 null',
                  },
                },
                required: ['title', 'estimatedMinutes', 'energy'],
              },
            },
          },
          required: ['title', 'deadline', 'time', 'priority', 'steps'],
        },
      },
    },
    required: ['question', 'tasks'],
  },
};

const refineTool = {
  name: 'return_refine_result',
  description: '返回把一个步骤拆得更细后的几个小步骤',
  input_schema: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            estimatedMinutes: { type: 'number' },
          },
          required: ['title', 'estimatedMinutes'],
        },
      },
    },
    required: ['steps'],
  },
};

interface NormalizedStep {
  title: string;
  estimatedMinutes: number;
  energy: 'high' | 'low' | null;
}

interface NormalizedTask {
  title: string;
  deadline: string | null;
  time: string | null;
  priority: 'high' | 'medium' | 'low';
  steps: NormalizedStep[];
}

function normalizeStep(value: unknown): NormalizedStep | null {
  const s = value as { title?: unknown; estimatedMinutes?: unknown; energy?: unknown };
  if (!s || typeof s !== 'object') return null;
  const title = typeof s.title === 'string' ? s.title.trim() : '';
  if (!title) return null;
  const minutes = Math.max(1, Math.round(Number(s.estimatedMinutes) || 15));
  const energy = s.energy === 'high' || s.energy === 'low' ? s.energy : null;
  return { title, estimatedMinutes: minutes, energy };
}

function normalizeDecompose(input: unknown): {
  tasks: NormalizedTask[];
  question: string | null;
} {
  const raw = (input ?? {}) as { question?: unknown; tasks?: unknown };
  const question =
    typeof raw.question === 'string' && raw.question.trim() ? raw.question.trim() : null;

  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  const tasks = rawTasks
    .map((t) => {
      const task = t as {
        title?: unknown;
        deadline?: unknown;
        time?: unknown;
        priority?: unknown;
        steps?: unknown;
      };
      if (!task || typeof task !== 'object') return null;
      const title = typeof task.title === 'string' ? task.title.trim() : '';
      if (!title) return null;
      const deadline =
        typeof task.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.deadline)
          ? task.deadline
          : null;
      const time =
        typeof task.time === 'string' && /^\d{2}:\d{2}$/.test(task.time) ? task.time : null;
      const priority =
        task.priority === 'high' || task.priority === 'medium' || task.priority === 'low'
          ? task.priority
          : 'medium';
      const normalizedSteps = (Array.isArray(task.steps) ? task.steps : [])
        .map(normalizeStep)
        .filter((s): s is NormalizedStep => s !== null);
      // 双重保险：AI 万一返回空 steps，生成一个兜底步骤，绝不返回空数组
      const steps =
        normalizedSteps.length > 0
          ? normalizedSteps
          : [{ title, estimatedMinutes: 15 }];
      return { title, deadline, time, priority, steps };
    })
    .filter((t): t is NormalizedTask => t !== null);

  return { tasks, question };
}

async function handleDecompose(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);

  const body = await readJson(request);
  const input = (body as { input?: unknown; maxMinutesPerStep?: unknown })?.input;
  if (typeof input !== 'string' || !input.trim()) {
    return errorJson('BAD_REQUEST', '缺少要拆解的内容', 400, cors);
  }
  if (input.length > MAX_INPUT_LENGTH) {
    return errorJson(
      'INPUT_TOO_LONG',
      `输入内容超过 ${MAX_INPUT_LENGTH} 字，请缩短后重试`,
      400,
      cors,
    );
  }

  const b = body as {
    today?: unknown;
    weekday?: unknown;
    maxMinutesPerStep?: unknown;
    clarification?: unknown;
  };
  const today = typeof b.today === 'string' ? b.today : new Date().toISOString().slice(0, 10);
  const weekday = typeof b.weekday === 'string' ? b.weekday : '';
  const maxMinutes =
    typeof b.maxMinutesPerStep === 'number' ? b.maxMinutesPerStep : 25;

  const lines = [
    `今天日期：${today}${weekday ? `（${weekday}）` : ''}`,
    `每步最长分钟数：${maxMinutes}`,
    `用户输入：\n${input}`,
  ];
  const clarification = b.clarification;
  if (
    clarification &&
    typeof clarification === 'object' &&
    (clarification as { question?: unknown }).question
  ) {
    const c = clarification as { question: string; answer?: unknown };
    lines.push(
      `\n之前的追问：${c.question}`,
      `用户的回答：${typeof c.answer === 'string' ? c.answer : ''}`,
    );
  }

  const data = await callClaude(env, decomposeTool, lines.join('\n'));
  const toolInput = extractToolInput(data, 'return_decompose_result');
  const result = normalizeDecompose(toolInput);

  if (result.question) {
    return json({ tasks: [], question: result.question }, 200, cors);
  }
  if (result.tasks.length === 0) {
    return errorJson('AI_EMPTY', 'AI 没有返回有效结果，请换个说法再试', 502, cors);
  }
  return json({ tasks: result.tasks, question: null }, 200, cors);
}

async function handleRefine(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request, env);

  const body = await readJson(request);
  const b = body as {
    taskTitle?: unknown;
    stepTitle?: unknown;
    maxMinutesPerStep?: unknown;
  };
  const taskTitle = typeof b.taskTitle === 'string' ? b.taskTitle.trim() : '';
  const stepTitle = typeof b.stepTitle === 'string' ? b.stepTitle.trim() : '';
  if (!taskTitle || !stepTitle) {
    return errorJson('BAD_REQUEST', '缺少任务标题或步骤标题', 400, cors);
  }
  const maxMinutes =
    typeof b.maxMinutesPerStep === 'number' ? b.maxMinutesPerStep : 15;

  const userText = [
    `任务标题：${taskTitle}`,
    `要拆细的步骤：${stepTitle}`,
    `每步最长分钟数：${maxMinutes}`,
  ].join('\n');

  const data = await callClaude(env, refineTool, userText);
  const toolInput = extractToolInput(data, 'return_refine_result');
  const rawSteps = (toolInput as { steps?: unknown })?.steps;
  const steps = (Array.isArray(rawSteps) ? rawSteps : [])
    .map(normalizeStep)
    .filter((s): s is NormalizedStep => s !== null);

  if (steps.length === 0) {
    return errorJson('AI_EMPTY', 'AI 没有返回有效结果，请稍后再试', 502, cors);
  }
  return json({ steps }, 200, cors);
}

async function handleTranscribe(request: Request, env: Env): Promise<Response> {
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
