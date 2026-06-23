import type { Metadata } from "next";
import { Inter, Outfit, Space_Grotesk } from "next/font/google";
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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://spacesapp.io"),
  title: "Infinite Canvas AI Brainstorming for Space S Visual Workspace",
  description: "Space S is an AI infinite canvas for brainstorming and research. Place AI responses as visual nodes, branch ideas, synthesize across topics, and collaborate live. Start free.",
  alternates: {
    canonical: "https://spacesapp.io",
  },
  openGraph: {
    title: "Space S: Infinite Canvas for AI Brainstorming & Research",
    description: "Space S turns every AI prompt into a movable card on a limitless canvas. Branch ideas, link insights, and collaborate live as your thinking takes shape.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Space S Infinite Canvas AI Brainstorming",
    description: "Break free from linear chat. Space S is an AI workspace where ideas become cards on a visual canvas. Branch, connect, and collaborate in real time.",
  },
  keywords: "AI brainstorming, infinite canvas tool, visual note taking, mind map AI, collaborative whiteboard, non linear thinking AI, AI research assistant",
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
      title: "Sign in to Space S",
      subtitle: "to continue to Space S",
    },
  },
  signUp: {
    start: {
      title: "Create your Space S account",
      subtitle: "to continue to Space S",
    },
  },
};

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Space S",
  "applicationCategory": "ProductivityApplication",
  "operatingSystem": "Web",
  "description": "An infinite canvas AI brainstorming tool. Place AI responses as spatial nodes, branch sub ideas, synthesize across topics, and collaborate in real time.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Infinite canvas with AI generated nodes",
    "Branch ideas from text selection",
    "Cross node synthesis between unrelated topics",
    "Real time multiplayer collaboration"
  ]
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What's the best AI brainstorming tool for visual thinkers?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Space S is built specifically for visual, non linear thinking. Unlike ChatGPT or Claude, which give you a single scrolling thread, Space S places every AI response as a node on an infinite canvas. You can move nodes around, connect them with thread lines, and branch off sub ideas spatially, making it the most complete AI brainstorming tool for people who think in maps, not lists."
      }
    },
    {
      "@type": "Question",
      "name": "How do I avoid losing context in long AI conversations?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The root cause of lost context isn't AI memory. It is the linear interface forcing everything into one sequential thread. Space S solves this architecturally: every topic lives in its own node, so you never have to scroll past unrelated content to find what you need. Branch off a new node whenever a conversation deepens, and connect nodes when topics overlap. Your context stays spatial and visible, not buried."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use Space S for team collaboration with AI?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Real time multiplayer is built into Space S from the ground up. Share an invite link and your collaborator joins the same canvas with their own colored cursor and username. Every node, every branch, and every connection syncs live. It's a true collaborative AI brainstorming board, not a read only shared document."
      }
    },
    {
      "@type": "Question",
      "name": "Is there an AI tool that works like a mind map?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Space S is the closest thing to a mind map AI tool that exists today. You start with a prompt, get an AI response as a card, then branch and connect cards across the canvas. It has the structure of a mind map, but every card is a live AI conversation you can continue. You can also connect two unrelated cards and ask Space S to find the connection between them, which no traditional mind map tool can do."
      }
    },
    {
      "@type": "Question",
      "name": "How is Space S different from Miro or FigJam?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Miro and FigJam are visual collaboration tools designed for human made content like sticky notes, shapes, and diagrams you draw yourself. Space S is an AI native canvas: every node is a live AI conversation you can continue, branch, and synthesize. The AI doesn't sit outside the canvas as a sidebar. It is the canvas. You can't replicate this with a Miro AI integration."
      }
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance} localization={clerkLocalization}>
      <html lang="en" className={`${inter.variable} ${outfit.variable} ${spaceGrotesk.variable}`}>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          />
        </head>
        <body className="antialiased bg-[#f8f5f0]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
