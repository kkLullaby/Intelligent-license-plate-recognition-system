# License Plate OCR App

基于 Next.js 和百度 OCR 的车牌识别与预约分流工具。

## Local Development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

在 `.env.local` 中填入百度 OCR 配置：

```env
BAIDU_OCR_API_KEY=your_baidu_ocr_api_key
BAIDU_OCR_SECRET_KEY=your_baidu_ocr_secret_key
```

本地默认访问：

```text
http://localhost:3000
```

## Production

服务器不要使用 `npm run dev`。生产环境先构建，再启动：

```bash
npm ci
npm run build
npm run start:prod
```

使用 PM2：

```bash
pm2 start npm --name plate-ocr -- run start:prod
pm2 save
```

建议用 Nginx 将 HTTPS 域名反向代理到 `127.0.0.1:3001`。

## 数据存储

预约名单和识别日志统一存放于 SQLite 数据库（Node 24 自带的 `node:sqlite`）：

```
data/app.db
```

首次启动时会自动建表，并把旧的 `src/data/reservations.json` 与 `recognition_logs/records.json` 一次性迁入数据库。无需手动操作。

### 常用路由

| 路由             | 用途                                             |
| ---------------- | ------------------------------------------------ |
| `/`              | 扫码 / OCR 大屏                                  |
| `/convert`       | 上传 CSV 覆盖预约名单                            |
| `/peek`          | **后台管理**：查看 / 搜索 / 增删改预约和识别日志 |
| `/api/reservations` | 预约 CRUD                                     |
| `/api/logs`      | 识别日志读写                                     |
| `/api/stats`     | 各门到场 / 预约统计                              |
| `/api/recognize` | OCR 识别                                         |
| `/api/convert`   | CSV 转换并覆盖数据库                             |
