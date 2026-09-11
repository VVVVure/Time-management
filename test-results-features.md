# 新功能验证：精力标签 / 时间字段 / 冰破步

- 测试时间：2026/9/11 21:22:15
- Worker：https://todo-planner-worker.leoliu190071.workers.dev
- 请求参数：today=2026-09-11，weekday=星期五，maxMinutesPerStep=25，clarification=null

## 1. 时间 + 精力标签（连续接送）

输入：明天11:15接Ryan然后再去Mascot接林紫樱

HTTP 200

```json
{
  "tasks": [
    {
      "title": "接Ryan再去Mascot接林紫樱",
      "deadline": "2026-09-12",
      "time": "11:15",
      "priority": "medium",
      "steps": [
        {
          "title": "驾车前往Ryan的位置",
          "estimatedMinutes": 15,
          "energy": "low"
        },
        {
          "title": "接上Ryan",
          "estimatedMinutes": 2,
          "energy": "low"
        },
        {
          "title": "驾车前往Mascot地点",
          "estimatedMinutes": 15,
          "energy": "low"
        },
        {
          "title": "接上林紫樱",
          "estimatedMinutes": 2,
          "energy": "low"
        }
      ]
    }
  ],
  "question": null
}
```

## 2. 冰破步 + 精力标签（写报告）

输入：下周三之前要交统计学的数据分析报告，我还没开始写

HTTP 200

```json
{
  "tasks": [
    {
      "title": "完成统计学数据分析报告",
      "deadline": "2026-09-16",
      "time": null,
      "priority": "high",
      "steps": [
        {
          "title": "打开电脑，新建报告文档框架（标题、摘要、引言、数据、方法、结果、讨论、结论等章节）",
          "estimatedMinutes": 5,
          "energy": "low"
        },
        {
          "title": "整理和导入原始数据到分析工具（Excel/Python/R等）",
          "estimatedMinutes": 20,
          "energy": "low"
        },
        {
          "title": "进行描述性统计分析（计算均值、方差、分布等基本统计量）",
          "estimatedMinutes": 25,
          "energy": "high"
        },
        {
          "title": "进行推断统计分析（假设检验、置信区间或相关性分析等）",
          "estimatedMinutes": 25,
          "energy": "high"
        },
        {
          "title": "绘制数据可视化图表（柱状图、散点图、分布图等）",
          "estimatedMinutes": 20,
          "energy": "high"
        },
        {
          "title": "撰写分析结果解释和结论部分",
          "estimatedMinutes": 25,
          "energy": "high"
        },
        {
          "title": "检查数据准确性，完善报告格式和排版",
          "estimatedMinutes": 15,
          "energy": "low"
        }
      ]
    }
  ],
  "question": null
}
```
