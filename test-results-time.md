# 时间字段与连续跑腿场景修复验证

- 测试时间：2026/9/11 21:00:39
- Worker：https://todo-planner-worker.leoliu190071.workers.dev
- 请求参数：today=2026-09-11，weekday=星期五，maxMinutesPerStep=25，clarification=null

## 1. 用户原话：连续接送

输入：明天11:15接Ryan然后再去Mascot接林紫樱

HTTP 200

```json
{
  "tasks": [
    {
      "title": "接Ryan和林紫樱",
      "deadline": "2026-09-12",
      "time": "11:15",
      "priority": "medium",
      "steps": [
        {
          "title": "前往接Ryan的地点",
          "estimatedMinutes": 15
        },
        {
          "title": "接Ryan",
          "estimatedMinutes": 5
        },
        {
          "title": "前往Mascot地点接林紫樱",
          "estimatedMinutes": 15
        },
        {
          "title": "接林紫樱",
          "estimatedMinutes": 5
        }
      ]
    }
  ],
  "question": null
}
```

## 2. 下午具体时间 + 顺路买菜

输入：下午3点去机场接妈妈然后顺路去超市买菜

HTTP 200

```json
{
  "tasks": [
    {
      "title": "去机场接妈妈，顺路去超市买菜",
      "deadline": null,
      "time": "15:00",
      "priority": "medium",
      "steps": [
        {
          "title": "出发前往机场",
          "estimatedMinutes": 10
        },
        {
          "title": "到达机场接妈妈",
          "estimatedMinutes": 15
        },
        {
          "title": "前往超市",
          "estimatedMinutes": 15
        },
        {
          "title": "购买所需食材",
          "estimatedMinutes": 20
        }
      ]
    }
  ],
  "question": null
}
```

## 3. 晚上具体时间 + 顺路拿药

输入：明晚8点约了牙医复诊然后顺路去药店拿药

HTTP 200

```json
{
  "tasks": [
    {
      "title": "牙医复诊并去药店拿药",
      "deadline": "2026-09-12",
      "time": "20:00",
      "priority": "medium",
      "steps": [
        {
          "title": "前往牙医诊所进行复诊",
          "estimatedMinutes": 20
        },
        {
          "title": "复诊后前往药店拿药",
          "estimatedMinutes": 15
        }
      ]
    }
  ],
  "question": null
}
```
