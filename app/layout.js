import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

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

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
      </body>
    </html>
  );
}
