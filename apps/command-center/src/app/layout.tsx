import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueSentry | SRE Autonomous Incident Responder",
  description: "Autonomous Incident Responder & Safe Self-Healing Agent on TrueForge",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full bg-zinc-950">
      <body className="h-full antialiased bg-zinc-950 text-zinc-100 flex flex-col">{children}</body>
    </html>
  );
}
