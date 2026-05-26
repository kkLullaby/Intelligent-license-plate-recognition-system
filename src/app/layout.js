import "./globals.css";

export const metadata = {
  title: "智能车牌识别与分流系统",
  description: "基于百度大脑OCR的开放日车辆实时分流应用",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
