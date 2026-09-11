# T4.1 拆解效果测试结果

- 测试时间：2026/9/11 19:36:09
- Worker：https://todo-planner-worker.leoliu190071.workers.dev
- 请求参数：today=2026-09-11，weekday=星期五，maxMinutesPerStep=25，clarification=null

## 1. 单件事

输入：下周三之前要交统计学的数据分析报告，我还没开始写

HTTP 200

```json
{
  "tasks": [
    {
      "title": "完成统计学数据分析报告",
      "deadline": "2026-09-16",
      "priority": "high",
      "steps": [
        {
          "title": "收集和整理数据源材料",
          "estimatedMinutes": 20
        },
        {
          "title": "确定报告框架和分析思路",
          "estimatedMinutes": 15
        },
        {
          "title": "进行数据统计计算和分析",
          "estimatedMinutes": 25
        },
        {
          "title": "编写报告初稿",
          "estimatedMinutes": 25
        },
        {
          "title": "检查数据准确性并修改完善",
          "estimatedMinutes": 15
        },
        {
          "title": "排版调整并提交报告",
          "estimatedMinutes": 10
        }
      ]
    }
  ],
  "question": null
}
```

## 2. 一句话多件事

输入：下周五要交UX的调研报告 还没开始 然后这周末得把房间收拾了

HTTP 200

```json
{
  "tasks": [
    {
      "title": "完成UX调研报告",
      "deadline": "2026-09-18",
      "priority": "high",
      "steps": [
        {
          "title": "确认调研报告的要求、格式和框架结构",
          "estimatedMinutes": 15
        },
        {
          "title": "收集并整理调研数据和相关资料",
          "estimatedMinutes": 25
        },
        {
          "title": "撰写调研分析部分",
          "estimatedMinutes": 25
        },
        {
          "title": "编写主要发现和结论",
          "estimatedMinutes": 20
        },
        {
          "title": "制作报告的可视化内容（图表、截图等）",
          "estimatedMinutes": 25
        },
        {
          "title": "整合所有内容并排版",
          "estimatedMinutes": 20
        },
        {
          "title": "审阅报告并修改完善",
          "estimatedMinutes": 15
        }
      ]
    },
    {
      "title": "整理收拾房间",
      "deadline": "2026-09-13",
      "priority": "medium",
      "steps": [
        {
          "title": "整理地面和桌面，清理杂物",
          "estimatedMinutes": 25
        },
        {
          "title": "整理衣服和物品归位",
          "estimatedMinutes": 25
        },
        {
          "title": "拖地打扫卫生",
          "estimatedMinutes": 20
        }
      ]
    }
  ],
  "question": null
}
```

## 3. 口语化/口头禅/没标点

输入：那个啥 我寻思着 明儿得把房租给交了 还有就是嗯 得买点菜回来 晚上做个饭

HTTP 200

```json
{
  "tasks": [
    {
      "title": "支付房租",
      "deadline": "2026-09-12",
      "priority": "high",
      "steps": [
        {
          "title": "打开银行App或登录网银，准备好房租账号和金额",
          "estimatedMinutes": 5
        },
        {
          "title": "转账房租到房东指定账户",
          "estimatedMinutes": 5
        }
      ]
    },
    {
      "title": "采购食材并做晚餐",
      "deadline": "2026-09-12",
      "priority": "medium",
      "steps": [
        {
          "title": "列出晚餐菜单所需的食材清单",
          "estimatedMinutes": 5
        },
        {
          "title": "前往超市或菜市场采购食材",
          "estimatedMinutes": 25
        },
        {
          "title": "整理食材，准备厨房工作台",
          "estimatedMinutes": 10
        },
        {
          "title": "烹饪晚餐",
          "estimatedMinutes": 25
        }
      ]
    }
  ],
  "question": null
}
```

## 4. 有相对日期

输入：明天下午去取快递 这周末给车做年检 下周五之前把简历改完投出去

HTTP 200

```json
{
  "tasks": [
    {
      "title": "取快递",
      "deadline": "2026-09-12",
      "priority": "medium",
      "steps": [
        {
          "title": "下午前往快递点取快递",
          "estimatedMinutes": 20
        }
      ]
    },
    {
      "title": "给车做年检",
      "deadline": "2026-09-13",
      "priority": "medium",
      "steps": [
        {
          "title": "查询年检时间和地点",
          "estimatedMinutes": 10
        },
        {
          "title": "提前预约年检时间",
          "estimatedMinutes": 5
        },
        {
          "title": "准备车辆相关证件和材料",
          "estimatedMinutes": 10
        },
        {
          "title": "驾车前往年检地点办理年检",
          "estimatedMinutes": 25
        }
      ]
    },
    {
      "title": "修改简历并投递",
      "deadline": "2026-09-18",
      "priority": "medium",
      "steps": [
        {
          "title": "打开现有简历进行审核",
          "estimatedMinutes": 15
        },
        {
          "title": "更新工作经历和项目经验内容",
          "estimatedMinutes": 25
        },
        {
          "title": "修改个人技能和自我评价部分",
          "estimatedMinutes": 20
        },
        {
          "title": "检查简历格式和语言表达",
          "estimatedMinutes": 15
        },
        {
          "title": "向目标公司和岗位投递简历",
          "estimatedMinutes": 20
        }
      ]
    }
  ],
  "question": null
}
```

## 5. 没有日期

输入：想学一下怎么用 Notion 整理读书笔记

HTTP 200

```json
{
  "tasks": [
    {
      "title": "学习用 Notion 整理读书笔记",
      "deadline": null,
      "priority": "medium",
      "steps": [
        {
          "title": "观看或阅读 Notion 读书笔记模板的入门教程",
          "estimatedMinutes": 25
        },
        {
          "title": "在 Notion 中创建一个读书笔记数据库并设置基础属性（书名、作者、进度等）",
          "estimatedMinutes": 20
        },
        {
          "title": "添加一条示例书籍的笔记并完整记录一个章节的内容，熟悉编辑和格式化功能",
          "estimatedMinutes": 20
        }
      ]
    }
  ],
  "question": null
}
```

## 6. 很简单的事

输入：给妈妈打电话

HTTP 200

```json
{
  "tasks": [
    {
      "title": "给妈妈打电话",
      "deadline": null,
      "priority": "medium",
      "steps": [
        {
          "title": "拨打妈妈的电话号码并通话",
          "estimatedMinutes": 15
        }
      ]
    }
  ],
  "question": null
}
```

## 7. 很模糊的事

输入：搞一下那个东西

HTTP 200

```json
{
  "tasks": [],
  "question": "你说的\"那个东西\"具体是什么？能否详细描述一下你要做的事情？"
}
```

## 8. 很大的目标

输入：学会 Python

HTTP 200

```json
{
  "tasks": [
    {
      "title": "学习 Python 基础",
      "deadline": null,
      "priority": "medium",
      "steps": [
        {
          "title": "安装 Python 和代码编辑器（如 VS Code）",
          "estimatedMinutes": 15
        },
        {
          "title": "学习 Python 基本语法（变量、数据类型、运算符）",
          "estimatedMinutes": 25
        },
        {
          "title": "练习条件语句和循环的编写",
          "estimatedMinutes": 25
        },
        {
          "title": "学习函数的定义和调用",
          "estimatedMinutes": 25
        },
        {
          "title": "学习列表、字典等常用数据结构",
          "estimatedMinutes": 25
        },
        {
          "title": "完成 5 道基础编程练习题",
          "estimatedMinutes": 25
        }
      ]
    }
  ],
  "question": null
}
```

## 9. 中英文混合

输入：把 Q3 的 OKR 写完 然后 review 一下 design doc 再约个 1 on 1 with my manager

HTTP 200

```json
{
  "tasks": [
    {
      "title": "完成 Q3 OKR 撰写",
      "deadline": null,
      "priority": "medium",
      "steps": [
        {
          "title": "收集本季度工作成果和数据支撑",
          "estimatedMinutes": 15
        },
        {
          "title": "根据公司目标梳理个人 OKR 目标",
          "estimatedMinutes": 20
        },
        {
          "title": "撰写 OKR 文档并完成初稿",
          "estimatedMinutes": 25
        }
      ]
    },
    {
      "title": "审阅 Design Doc",
      "deadline": null,
      "priority": "medium",
      "steps": [
        {
          "title": "打开 Design Doc 并逐章节阅读",
          "estimatedMinutes": 20
        },
        {
          "title": "记录反馈意见并提出修改建议",
          "estimatedMinutes": 15
        }
      ]
    },
    {
      "title": "预约与经理的 1 on 1 会议",
      "deadline": null,
      "priority": "medium",
      "steps": [
        {
          "title": "查看经理的日程表找到合适时间",
          "estimatedMinutes": 10
        },
        {
          "title": "发送会议邀请给经理确认时间",
          "estimatedMinutes": 5
        }
      ]
    }
  ],
  "question": null
}
```

## 10. 很急的事

输入：签证材料明天一早就要用 我现在还没整理 很急 帮我列个清单

HTTP 200

```json
{
  "tasks": [],
  "question": "你的签证申请是去哪个国家？需要哪些具体材料（如护照、身份证、财务证明、健康检查等）？"
}
```
