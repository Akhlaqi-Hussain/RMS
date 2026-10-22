import localFont from "next/font/local";
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

// OFF-1: Geist is loaded from app/fonts instead of Google Fonts, so the
// app builds and runs without an internet connection.
const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
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
