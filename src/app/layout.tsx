import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Space-S — Infinite Thinking Canvas",
  description: "An infinite thinking canvas powered by AI reasoning models",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#7c4dff",
    fontFamily: "var(--font-outfit), sans-serif",
  },
  elements: {
    footer: { display: "none" },
    userButtonPopoverFooter: { display: "none" }
  }
};

const clerkLocalization = {
  signIn: {
    start: {
      title: "Sign in to Space-S",
      subtitle: "to continue to Space-S",
    },
  },
  signUp: {
    start: {
      title: "Create your Space-S account",
      subtitle: "to continue to Space-S",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance} localization={clerkLocalization}>
      <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
        <body className="antialiased bg-[#f8f5f0]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
