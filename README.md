# Pricing NetEase - KOL 供应商比价系统 V1

本项目基于 Next.js（App Router）实现，支持本地上传选号表，读取飞书普通表格历史数据，完成 KOL 匹配与比价输出。

## 本地启动

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量：

```bash
cp .env.example .env.local
```

在 `.env.local` 填写飞书应用和表格参数：

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_SELF_KOL_SPREADSHEET_TOKEN`
- `FEISHU_SELF_KOL_SHEET_ID`（可选，不填默认取第一个 sheet）
- `FEISHU_SELF_KOL_RANGE`（可选，默认 `A:AG`）
- `FEISHU_SUPPLIER_SPREADSHEET_TOKEN`
- `FEISHU_SUPPLIER_RANGE`（可选，默认 `A:Q`）

3. 启动开发环境：

```bash
npm run dev
```

访问 `http://localhost:3000`。

## 主要能力

- 上传 Excel 选号表（首个 sheet，识别 `账号类别/抖音昵称/账号id`）。
- 服务端读取飞书普通表格（密钥只在服务端环境变量）。
- 供应商比价表自动遍历该电子表格下全部 sheet，按统一 range 读取并合并。
- 按优先级匹配 KOL（精确 id -> 清洗后 id -> 昵称）。
- 输出 KOL 比价总看板、KOL 详情和推荐比价方案。
- 详情页展示按供应商分组的价格趋势折线图。
