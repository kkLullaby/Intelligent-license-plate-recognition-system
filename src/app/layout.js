import { IBM_Plex_Mono } from 'next/font/google';
import "./globals.css";

// 等宽数字字体，用于 HUD 统计、车牌徽章等需要"终端感"的数字
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

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
    <html lang="zh-CN" className={plexMono.variable}>
      <body>{children}</body>
    </html>
  );
}
