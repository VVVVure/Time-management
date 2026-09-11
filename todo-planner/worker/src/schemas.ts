export const decomposeTool = {
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
            recurrence: {
              type: ['object', 'null'],
              description:
                '重复规则，只有用户明确说了"每天""每周""每两周""每月"这类重复说法才填，没提到重复就是 null',
              properties: {
                freq: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                interval: { type: 'number', description: '间隔，比如每两周是 freq=weekly, interval=2' },
                endDate: {
                  type: ['string', 'null'],
                  description: '重复到哪天为止，YYYY-MM-DD，没提到就是 null（一直重复）',
                },
              },
            },
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
          required: ['title', 'deadline', 'time', 'priority', 'recurrence', 'steps'],
        },
      },
    },
    required: ['question', 'tasks'],
  },
};

export const refineTool = {
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
