import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "FLOWPRINT — Process Intelligence",
  description: "See the Work. Find the Waste. Design What's Next.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}<Toaster position="bottom-right" richColors closeButton /></body></html>;
}
