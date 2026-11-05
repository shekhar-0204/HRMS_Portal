import type { Metadata } from "next";
import "./globals.css";
import { HRMSProvider } from "@/context/hrms-context";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Graapes HRMS Portal — Human Resource Management System",
  description: "Enterprise HRMS Portal for Graapes Private Limited. Centralized employee management, attendance, leave workflows, and organization structure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <HRMSProvider>
          {children}
          <Toaster position="top-right" richColors />
        </HRMSProvider>
      </body>
    </html>
  );
}
