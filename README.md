# Shampoo Calendar

Shampoo Calendar 是一个零依赖 Java Web 日历应用，内置 2026-2036 日期范围。用户可以添加会议、约会、面试等重要事项，并设置洗头间隔，系统会把重要事项前一天标记为洗头日，同时在事项之间均衡补齐常规洗头日期。

## 功能

- 导入 `2026-01-01` 到 `2036-12-31` 的日期范围数据。
- 在日历上添加、查看重要事项，并设置“非常重要 / 一般 / 不太重要”三级重要程度。
- 拖动日历上的事项标签即可修改日期，右键事项标签可以删除事项。
- 设置“基础间隔 - 向下浮动 / + 向上浮动”，例如 `3 -1/+2` 表示洗头间隔保持在 2-5 天。
- 自动计算洗头日期：
  - 优先满足非常重要事项的前一天洗头提醒。
  - 再按当前区间尝试满足一般和不太重要事项。
  - 多个已满足事项之间按基础间隔补齐，无法整齐对齐时少量使用向下或向上浮动天数。
  - 当重要事项锚点导致间隔无法整除时，优先避免出现超过最大间隔的长空档。
  - 没有重要事项时按固定间隔生成洗头日。
- 事项数据保存在浏览器 `localStorage`，不上传服务器。
- 原生 HTML/CSS/JavaScript 前端，Java 7 标准库 HTTP 服务，无 Maven/Spring 依赖。

## 运行要求

- JDK 7 或更高版本。
- 需要能执行 `javac`。只有 JRE 不够。

## 本地运行

Windows PowerShell:

```powershell
.\run.ps1
```

Windows CMD:

```bat
run.bat
```

启动后打开：

```text
http://localhost:8080
```

如需指定端口：

```powershell
$env:PORT="9090"
.\run.ps1
```

## 项目结构

```text
src/main/java/com/shampoocalendar
  model/                数据模型
  service/              日期数据与洗头规划算法
  util/                 日期工具
  web/                  HTTP API 与静态文件服务
src/main/resources
  data/date-range.properties
  public/               前端页面、样式、脚本和视觉资产
```

## API

- `GET /api/dates?year=2026&month=5`：返回指定月份日期数据。
- `POST /api/plan`：根据事项和间隔返回洗头计划。

`/api/plan` 使用 `application/x-www-form-urlencoded`：

```text
baseIntervalDays=2
minusFlexIntervalDays=0
plusFlexIntervalDays=1
events=2026-05-12|参加会议
2026-05-20|面试
```

事项也可以传入重要等级，格式为 `日期|等级|标题`：

```text
baseIntervalDays=2
minusFlexIntervalDays=0
plusFlexIntervalDays=1
events=2026-05-12|very-important|参加会议
2026-05-20|normal|面试
2026-05-28|low|朋友聚餐
```

等级可选值：

- `very-important`：非常重要
- `normal`：一般
- `low`：不太重要

## 许可证

MIT License
