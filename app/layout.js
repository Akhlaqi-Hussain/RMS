import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/context/LanguageContext";
import {
  LOCALE_COOKIE,
  getDir,
  getLangTag,
  normalizeLocale,
} from "@/lib/i18n/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "RMS",
  description: "Restaurant Management System",
};

// I18N-01: language and text direction come from the "lang" cookie
// (English, left-to-right, when no language has been chosen yet).
export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={getLangTag(locale)} dir={getDir(locale)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider initialLocale={locale}>
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              style: {
                background: "#333", // dark background
                color: "#fff", // white text
                fontWeight: "500",
              },
              success: {
                duration: 4000,
                style: {
                  background: "#2c786c", // green
                  color: "#fff",
                },
              },
              error: {
                duration: 4000,
                style: {
                  background: "#ef4444", // red
                  color: "#fff",
                },
              },
            }}
          />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
