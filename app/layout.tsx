import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "障害者総合支援法クイズ",
  description: "障害者総合支援法を学習するための自分専用クイズ学習ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
