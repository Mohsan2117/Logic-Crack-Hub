import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logic Crack Studio | Android Game Development",
  description:
    "Logic Crack Studio creates engaging Unity-powered Android games with a focus on gameplay, design, performance, and polished mobile experiences.",
  openGraph: {
    title: "Logic Crack Studio | Android Game Development",
    description:
      "Unity-powered Android game development for polished mobile gameplay experiences.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
