import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "딸깍일기",
  description: "한 번의 딸깍으로 시작하는 감정 일기",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF6EE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto min-h-dvh max-w-[420px] bg-cream">
          {children}
        </div>
      </body>
    </html>
  );
}
