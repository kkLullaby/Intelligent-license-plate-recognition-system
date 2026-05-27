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

## Reservation Data

预约名单位于 `src/data/reservations.json`：

```json
[
  {
    "plate": "沪A12345",
    "parkingLot": "A区",
    "isReserved": true
  }
]
```

当前手机端支持 OCR 识别和手动车牌查询。手动查询会使用打包到前端的预约名单，适合作为弱网兜底。
