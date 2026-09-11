# 重复规则 AI 识别验证

- 测试时间：2026/9/11 22:24:49
- Worker：https://todo-planner-worker.leoliu190071.workers.dev
- 请求参数：today=2026-09-11，weekday=星期五，maxMinutesPerStep=25，clarification=null

## 1. 明确每天

输入：每天早上吃维生素

HTTP 200

```json
{
  "tasks": [
    {
      "title": "每天早上吃维生素",
      "deadline": null,
      "time": null,
      "priority": "medium",
      "recurrence": {
        "freq": "daily",
        "interval": 1,
        "endDate": null
      },
      "steps": [
        {
          "title": "取出维生素，用水吞服",
          "estimatedMinutes": 2,
          "energy": "low"
        }
      ]
    }
  ],
  "question": null
}
```

## 2. 每两周

输入：每两周整理一次邮箱

HTTP 200

```json
{
  "tasks": [
    {
      "title": "整理邮箱",
      "deadline": null,
      "time": null,
      "priority": "medium",
      "recurrence": {
        "freq": "weekly",
        "interval": 2,
        "endDate": null
      },
      "steps": [
        {
          "title": "打开邮箱，查看未读邮件列表",
          "estimatedMinutes": 3,
          "energy": "low"
        },
        {
          "title": "筛选并删除垃圾邮件、营销邮件",
          "estimatedMinutes": 10,
          "energy": "low"
        },
        {
          "title": "整理重要邮件到对应文件夹（如工作、财务、订阅等）",
          "estimatedMinutes": 12,
          "energy": "low"
        }
      ]
    }
  ],
  "question": null
}
```

## 3. 每月

输入：每月1号交房租

HTTP 200

```json
{
  "tasks": [
    {
      "title": "交房租",
      "deadline": null,
      "time": null,
      "priority": "medium",
      "recurrence": {
        "freq": "monthly",
        "interval": 1,
        "endDate": null
      },
      "steps": [
        {
          "title": "打开手机/电脑，准备进行房租转账",
          "estimatedMinutes": 3,
          "energy": "low"
        },
        {
          "title": "完成房租转账或支付",
          "estimatedMinutes": 5,
          "energy": "low"
        }
      ]
    }
  ],
  "question": null
}
```

## 4. 带结束日期的重复

输入：每天吃药，吃两周

HTTP 200

```json
{
  "tasks": [
    {
      "title": "每天吃药",
      "deadline": "2026-09-25",
      "time": null,
      "priority": "medium",
      "recurrence": {
        "freq": "daily",
        "interval": 1,
        "endDate": "2026-09-25"
      },
      "steps": [
        {
          "title": "按时服用药物",
          "estimatedMinutes": 2,
          "energy": "low"
        }
      ]
    }
  ],
  "question": null
}
```

## 5. 普通句子不应误判

输入：明天交报告

HTTP 200

```json
{
  "tasks": [
    {
      "title": "交报告",
      "deadline": "2026-09-12",
      "time": null,
      "priority": "medium",
      "recurrence": null,
      "steps": [
        {
          "title": "提交报告",
          "estimatedMinutes": 5,
          "energy": "low"
        }
      ]
    }
  ],
  "question": null
}
```

## 6. 不支持：每个工作日应保持 null

输入：每个工作日去健身房

HTTP 200

```json
{
  "tasks": [
    {
      "title": "去健身房",
      "deadline": null,
      "time": null,
      "priority": "medium",
      "recurrence": null,
      "steps": [
        {
          "title": "出门前穿上运动装备和准备好健身包",
          "estimatedMinutes": 5,
          "energy": "low"
        }
      ]
    }
  ],
  "question": null
}
```
