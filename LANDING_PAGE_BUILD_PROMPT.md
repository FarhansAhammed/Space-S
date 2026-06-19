# SPACES — Landing Page Build Prompt
# For: Antigravity / Claude Code (vibe coding tool)
# Goal: Full landing page revamp, SEO-optimized, AI SEO-ready, dark crime-board aesthetic

---

## WHAT YOU ARE BUILDING

A landing page for **Spaces** — an infinite canvas AI productivity web app.
The page lives at `/` (root) of a Next.js 14 App Router project.
File to create or replace: `app/page.tsx` (and any component files needed).
All styling: Tailwind CSS only. No external UI libraries. No CSS modules.

Read the entire prompt before writing a single line of code.

---

## CORE AESTHETIC — NON-NEGOTIABLE

The visual identity is a **dark FBI crime investigation board**.

- Background: `#13131a` (near-black, not pure black)
- Canvas dots: subtle radial dot grid overlay at `3%` opacity using a background-image CSS pattern
- Primary accent: `#c0392b` (deep red — the "thread" color from crime boards)
- Secondary accent: `#7878c8` (muted indigo — the AI/node color)
- Text primary: `#e8e8ec`
- Text secondary: `#888899`
- Node/card backgrounds: `#1e1e28` with `0.5px` border `#2e2e3a`
- Font: `Inter` for body (import via next/font). `Space Grotesk` for display headings (also via next/font).
- Border radius: `10px` on cards, `6px` on buttons — nothing rounder than this. No pill shapes anywhere.

The single signature element of this page: **a live animated canvas preview** in the hero section where 3-4 nodes visibly appear one by one, connected by animated red thread lines, giving the impression of a real investigation board being built in real time. This is pure CSS/JS animation — no canvas API, no Three.js, just absolutely-positioned divs with staggered fade-in and SVG lines drawing themselves. This is what people remember.

Do NOT use gradients unless they are extremely subtle dark-on-dark. Do NOT use glow effects. Do NOT use neon. Do NOT use glassmorphism blurs. The aesthetic is analog — thread, pin, card, board.

---

## SEO REQUIREMENTS — READ BEFORE WRITING ANY HTML

These are mandatory. Every item below must appear exactly as specified.

### Meta tags (in `app/layout.tsx` or via Next.js `generateMetadata`):

```typescript
title: "Infinite Canvas AI Brainstorming — Spaces Visual Workspace"
description: "Spaces is an AI infinite canvas for brainstorming and research. Place AI responses as visual nodes, branch ideas, synthesize across topics, and collaborate live. Start free."
canonical: "https://spacesapp.io" // replace with actual domain
og:title: "Spaces: Infinite Canvas for AI Brainstorming & Research"
og:description: "Spaces turns every AI prompt into a movable card on a limitless canvas. Branch ideas, link insights, and collaborate live — see your thinking take shape."
og:type: "website"
og:image: "/og-image.png" // placeholder, must be in public/ folder
twitter:card: "summary_large_image"
twitter:title: "Spaces – Infinite Canvas AI Brainstorming"
twitter:description: "Break free from linear chat. Spaces is an AI workspace where ideas become cards on a visual canvas. Branch, connect, and collaborate in real time."
keywords: "AI brainstorming, infinite canvas tool, visual note taking, mind map AI, collaborative whiteboard, non-linear thinking AI, AI research assistant"
```

### Structured data (inject as `<script type="application/ld+json">` in the `<head>`):

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Spaces",
  "applicationCategory": "ProductivityApplication",
  "operatingSystem": "Web",
  "description": "An infinite canvas AI brainstorming tool. Place AI responses as spatial nodes, branch sub-ideas, synthesize across topics, and collaborate in real time.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Infinite canvas with AI-generated nodes",
    "Branch ideas from text selection",
    "Cross-node synthesis between unrelated topics",
    "Real-time multiplayer collaboration",
    "PDF and image upload with auto-transcription",
    "Image generation on canvas"
  ]
}
```

Also add a `FAQPage` schema block containing the 5 most common questions (see Section 6 of this prompt for the questions).

### Heading hierarchy (strict — do not deviate):
- One `<h1>` on the page: exactly the text `Infinite Canvas AI Workspace`
- `<h2>` for each major section: "The Problem", "How It Works", "Features", "Who Uses Spaces", "How to Use Spaces" (the kids section), "Frequently Asked Questions", "Start Thinking Spatially"
- `<h3>` for individual feature names and FAQ questions

### Keywords to embed naturally (do not stuff — one per paragraph is the ceiling):
Naturally use these across the page copy:
`infinite canvas AI tool` / `AI brainstorming tool` / `visual thinking AI` /
`non-linear AI conversation tool` / `mind map AI` / `collaborative AI brainstorming board` /
`AI research assistant` / `spatial note taking app AI` / `multiplayer AI brainstorming tool` /
`connect ideas across AI conversations` / `AI knowledge visualization tool` /
`infinite canvas AI collaboration` / `AI thinking workspace`

---

## PAGE SECTIONS — BUILD EXACTLY IN THIS ORDER

---

### SECTION 1: NAVBAR

Sticky top navbar. Height 56px. Background `#13131a` with `border-bottom: 0.5px solid #2a2a35`.

Left: Logo — the word `spaces` in `Space Grotesk`, weight 600, size 18px, color `#e8e8ec`. A small `•` in `#c0392b` after the word (like a pin marker).

Right: Nav links — `Features`, `How it Works`, `Pricing` (all anchor links to sections below). Then a CTA button: `Start for free` — background `#c0392b`, text white, padding `8px 18px`, border-radius `6px`, font-size `13px`, font-weight 500.

On mobile: collapse nav links, keep logo and CTA button only.

---

### SECTION 2: HERO

Full viewport height (`100vh`). Centered layout with two columns on desktop, stacked on mobile.

**Left column (55% width):**

Eyebrow label above H1: small text `AI THINKING WORKSPACE`, font-size `11px`, letter-spacing `0.12em`, color `#c0392b`, uppercase. No background pill — just the text.

`<h1>`: `Infinite Canvas AI Workspace`
Font: Space Grotesk, weight 700, size `clamp(38px, 5vw, 64px)`, color `#e8e8ec`, line-height 1.1.
The word `Canvas` should be underlined with a single `#c0392b` line (use CSS `text-decoration` with `text-decoration-color`).

Subheading `<p>` (30–40 words, this is the SEO subheading — keep this copy exactly):
`Replace linear AI chat threads with a limitless AI brainstorming tool. Drop prompts anywhere, branch ideas into connected nodes, and see your research take shape on a visual thinking canvas.`
Font: Inter, size 17px, color `#888899`, line-height 1.65, max-width 520px.

Two CTA buttons side by side:
- Primary: `Start for free` — bg `#c0392b`, text white, 14px font, padding `11px 24px`, border-radius `6px`
- Secondary: `See how it works` — bg transparent, border `0.5px solid #3a3a50`, text `#aaaacc`, same padding — anchor link to How It Works section

Below the buttons, social proof line (small, subtle):
`No credit card required · Works in your browser · Free forever plan`
Font-size 12px, color `#555566`.

**Right column (45% width) — THE SIGNATURE ANIMATED CANVAS PREVIEW:**

A `div` with `background: #1a1a24`, `border: 0.5px solid #2e2e3a`, `border-radius: 10px`, `height: 420px on desktop`, `overflow: hidden`, `position: relative`.

Inside it, build the animation using only React state, CSS transitions, and an SVG layer. Here is exactly what animates:

1. At `t=0`: The container is dark and empty. A subtle dot-grid background is visible.
2. At `t=0.4s`: Node 1 fades in at position `top: 40px, left: 30px`. It is a small card (`width: 200px`) with header text `"What is quantum entanglement?"` in `#7878c8` (11px, uppercase) and body text `"A phenomenon where two particles share quantum state instantly regardless of distance..."` in `#aaaaaa` (11px, 2 lines). A small red pin dot appears at top-left of the card.
3. At `t=1.2s`: Node 2 fades in at `top: 170px, left: 200px`. Header: `"Applications in cryptography"`. Body: `"Quantum key distribution uses entanglement to create theoretically unbreakable encryption..."`.
4. At `t=1.8s`: An SVG line draws itself (stroke-dashoffset animation) from the center-right of Node 1 to the center-left of Node 2. The line is `stroke: #c0392b`, `stroke-width: 1.5`, `stroke-dasharray: 4 3`, animated over `0.6s`.
5. At `t=2.6s`: Node 3 fades in at `top: 50px, right: 20px`, slightly different style — purple border `#7878c8`. Header: `"SYNTHESIS"` label. Body: `"Quantum entanglement enables cryptography by..."`. This represents the merge/synthesis node.
6. At `t=3.4s`: A second thread line draws from Node 2 to Node 3.
7. At `t=4.5s`: A small cursor dot (8px circle in `#c0392b`) appears and slowly moves across the canvas, simulating a second user's cursor. It has a small label next to it: `"Rahim"` in 10px white.
8. After the full sequence completes (`t=5.5s`), loop the animation from the beginning with a `1s` fade-out → fade-in transition on the whole container.

Use `useEffect` with `setTimeout` chains to drive the state. Keep it simple — just CSS `opacity` and `transform: translateY(8px) → translateY(0)` transitions on each node. The SVG line uses `strokeDashoffset` animation.

Caption below the preview box:
`Live canvas preview — every response is a node you control.`
Font-size 11px, color `#555566`, text-align center, margin-top 8px.

---

### SECTION 3: THE PROBLEM STRIP

Dark background `#0f0f16`. Padding: `80px 0`.

Centered heading `<h2>`: `The Problem` — but displayed as a smaller eyebrow, font-size 13px, uppercase, letter-spacing 0.1em, color `#c0392b`. No large H2 display here — the real heading is the quote below.

Large pull-quote displayed prominently (this is real user language from Reddit research):
`"It's like being forced to have a complex brainstorming session through a narrow hallway — you can only talk about one thing at a time, in order."`

Style: Space Grotesk, size `clamp(20px, 2.5vw, 28px)`, color `#ccccdd`, line-height 1.4, max-width 700px, centered. Left-border `4px solid #c0392b` on desktop (blockquote style), left-aligned text, left-padding 28px.

Attribution below: `— r/ChatGPT user, 2025` — font-size 12px, color `#555566`.

Below the quote, three pain point cards in a row (or stacked on mobile). Each card: `background: #1e1e28`, `border: 0.5px solid #2a2a38`, `border-radius: 10px`, `padding: 24px`, equal width.

Card 1:
- Icon: a simple SVG of a downward arrow into a box (lost context)
- Heading (h3): `Lost in the scroll`
- Body: `That one brilliant insight from 40 messages ago? Good luck finding it. Linear chat buries your best thinking under the weight of everything that came after.`

Card 2:
- Icon: SVG of broken chain link
- Heading (h3): `Connections that never happen`
- Body: `You run three separate AI chats on different angles of a problem. They never talk to each other. The synthesis lives only in your head — if you remember to make it.`

Card 3:
- Icon: SVG of two people with a wall between them
- Heading (h3): `Collaboration is an afterthought`
- Body: `"I can't believe there is no way to collaborate. It makes no sense." Every major AI chat tool is single-player by design. Your team is left stitching outputs together manually.`

SVG icons should be inline, simple, monoline style, `24px`, color `#c0392b`.

---

### SECTION 4: HOW IT WORKS (Step-by-step)

Background: `#13131a`. Padding `100px 0`.

`<h2>`: `How It Works`
Font: Space Grotesk, weight 700, size `clamp(28px, 3.5vw, 42px)`, color `#e8e8ec`.
Subtext below: `From blank canvas to structured insight in four moves.`
Font: Inter, 16px, color `#888899`.

Four steps in a vertical timeline layout on mobile, horizontal on desktop (2x2 grid).
Each step has a large step number (`01`, `02`, `03`, `04`) in Space Grotesk, size 48px, color `#2a2a3a` (very dark, background texture). The number sits behind the card title visually (use `position: relative`, `z-index`).

Step 01:
`<h3>`: `Click anywhere. Ask anything.`
Body: `The canvas is yours. Click an empty spot and type your question — your AI response appears right there as a node, exactly where you placed it. Not in a thread. On a board.`
Keyword embedded: *infinite canvas AI tool*

Step 02:
`<h3>`: `Branch from what matters.`
Body: `Select any sentence in any node. Hit Branch. A new connected node expands outward, diving into just that sub-idea — with a red thread connecting it to where it came from. Your train of thought, made visible.`
Keyword embedded: *non-linear AI conversation tool*

Step 03:
`<h3>`: `Connect the unconnected.`
Body: `Draw a line between two nodes — even ones from completely different topics. Hit Synthesize. Spaces reads both and generates a third node that finds the actual bridge between them. This is the feature that doesn't exist anywhere else.`
Keyword embedded: *connect ideas across AI conversations*

Step 04:
`<h3>`: `Think together, in real time.`
Body: `Share a link. Your collaborator joins the same canvas with their own cursor and color. Everyone adds, branches, and connects simultaneously. The board is the meeting.`
Keyword embedded: *multiplayer AI brainstorming tool*

---

### SECTION 5: FEATURES

Background: `#0f0f16`. Padding `100px 0`.

`<h2>`: `Features`
Same style as How It Works heading.
Subtext: `Everything you need to think in more than one dimension.`

Layout: alternating left-right layout on desktop (feature description on left, visual mockup on right, then flipped, etc.). On mobile: stacked, description first then mockup.

For each feature, the "mockup" is a dark `div` with `background: #1a1a24`, `border: 0.5px solid #2a2a3a`, `border-radius: 10px`, `min-height: 200px` containing a simple static representation of the feature (just styled divs and text — no images needed, we are building UI representations with HTML/CSS that mimic what the feature looks like).

Feature 1 — Prompt-to-Node:
`<h3>`: `Prompt-to-Node Canvas`
Body: `Click anywhere on the blank canvas and type a prompt. Spaces creates a rich AI answer as a floating card right there. No more linear threads — your ideas appear spatially, ready to be arranged and expanded on your AI thinking workspace.`
Tag: `<span>` with text `AI-POWERED` — small pill, `background: #1e1e38`, `color: #7878c8`, `font-size: 10px`, `padding: 3px 8px`, `border-radius: 4px`.

Feature 2 — Branch from Selection:
`<h3>`: `Branch From Any Idea`
Body: `Select any part of an AI response. Hit Branch. Spaces splits that sub-idea into its own connected node — drilling into one branch without losing the context of where it came from. True non-linear AI conversation, not a chat restart.`

Feature 3 — Cross-Node Synthesis:
`<h3>`: `Synthesize Across Topics`
Body: `Draw a connection between two completely unrelated nodes and tap Synthesize. The AI reads both and generates a new node that finds real connections between them. This is AI knowledge visualization working in your favor — unexpected insight, automatically surfaced.`
Add a small badge: `✦ MOST UNIQUE` — same pill style, accent `#c0392b`.

Feature 4 — Multiplayer:
`<h3>`: `Real-Time Collaborative Canvas`
Body: `Invite your team via a single link. Each person joins the collaborative AI brainstorming board with their own colored cursor and username. Add nodes, branch ideas, and synthesize together — simultaneously. The canvas is the room.`

Feature 5 — Upload and Transcribe:
`<h3>`: `Upload Anything. Understand Everything.`
Body: `Drag in a PDF, image, or screenshot. Spaces reads and transcribes it into a text node automatically. Your research papers, meeting notes, and diagrams live on the same canvas as your AI conversations — a true spatial note taking app powered by AI.`

---

### SECTION 6: WHO USES SPACES

Background: `#13131a`. Padding `80px 0`.

`<h2>`: `Who Uses Spaces`
Subtext: `Built for people whose thinking doesn't fit in a box.`

Three cards side by side (stacked on mobile). Each card: `background: #1e1e28`, `border-radius: 10px`, `padding: 28px`, `border: 0.5px solid #2a2a3a`.

Card 1 — Researchers:
Eyebrow: `RESEARCHERS` (10px uppercase, `#c0392b`)
Body: `Researchers use Spaces to run AI-powered literature reviews. They upload papers directly onto the canvas, branch findings by theme, and synthesize contradictions — all inside one visual AI research assistant.`

Card 2 — Founders & PMs:
Eyebrow: `FOUNDERS & PMs`
Body: `Founders and product managers use Spaces to map strategy. They run AI brainstorming sessions across multiple angles of a problem, connect insights from different contexts, and share the canvas with their team as a live working document.`

Card 3 — Students:
Eyebrow: `STUDENTS`
Body: `Students working on complex papers or projects build their entire research structure on Spaces. They break topics into connected cards, draw relationships like a mind map AI would generate, and never lose the thread of a long study session.`

---

### SECTION 7: HOW TO USE SPACES (THE KID-FRIENDLY SECTION)

This is the most important section for retention and clarity. Design it to be visually distinct from the rest of the page — lighter, slightly warmer, more playful — but still within the dark theme.

Background: `#16161f` with a subtle `2px` dashed border on top and bottom: `border-top: 2px dashed #2a2a3a`. This separates it visually from the sections above and below.

`<h2>`: `How to Use Spaces`
Subtext (this is the only place on the page where copy is intentionally simple and direct):
`Even if you've never used an AI tool before, you'll understand this in 60 seconds.`
Font: Inter, 16px, color `#888899`.

Five steps displayed as a numbered horizontal sequence on desktop, vertical on mobile. Each step is a card with a large number, an icon, a one-sentence heading, and a two-sentence body written in the simplest possible English — as if explaining to a curious 10-year-old:

Step 1:
Number: `1` in Space Grotesk, 36px, color `#c0392b`
Icon: SVG of a cursor clicking
Heading: `Open your canvas`
Body: `You see a big dark empty space — like a blank piece of paper, but infinite. This is where your thinking will happen.`

Step 2:
Number: `2`
Icon: SVG of a speech bubble
Heading: `Ask a question anywhere`
Body: `Click anywhere on the canvas and type a question — just like texting. The AI answers you, and that answer appears as a card right where you clicked.`

Step 3:
Number: `3`
Icon: SVG of scissors/selection
Heading: `Pick a part you want to know more about`
Body: `See something interesting in the answer? Highlight it with your mouse. A button appears that says "Branch." Click it, and a new card grows out to the side with a deeper answer — connected by a line.`

Step 4:
Number: `4`
Icon: SVG of two cards with a link between them
Heading: `Connect two ideas from different topics`
Body: `Say you have a card about black holes and another about philosophy. Draw a line between them and click "Synthesize." Spaces will find what connects them — often something surprising.`

Step 5:
Number: `5`
Icon: SVG of two cursors
Heading: `Invite a friend`
Body: `Click Invite, share the link. Your friend joins the same canvas. You can both add cards and ideas at the same time — like a shared whiteboard, but smarter.`

Below all 5 steps, a light callout box:
Background: `#1a1a28`, `border: 1px solid #3a3a50`, `border-radius: 8px`, `padding: 20px 24px`.
Text: `🎓 Teachers: Spaces works great for classroom brainstorming sessions. Students can work on the same canvas during a lesson — every student's thinking visible in real time.`
Font: Inter, 14px, color `#aaaacc`.

---

### SECTION 8: FAQ (SEO + AEO — CRITICAL)

Background: `#0f0f16`. Padding `80px 0`.

`<h2>`: `Frequently Asked Questions`
Subtext: `If you've used AI tools before, you probably have these questions.`

Build as an accessible accordion (each `<h3>` is the question, clicking reveals the answer). Use React `useState` for open/close. No third-party accordion library. The open indicator is a `+` that rotates to `×` when open. Smooth height transition with `max-height` CSS transition.

Include these 5 questions and answers exactly (these are tuned for Google AI Overviews and Perplexity):

**Q1 (h3):** `What's the best AI brainstorming tool for visual thinkers?`
**A:** Spaces is built specifically for visual, non-linear thinking. Unlike ChatGPT or Claude, which give you a single scrolling thread, Spaces places every AI response as a node on an infinite canvas. You can move nodes around, connect them with thread lines, and branch off sub-ideas spatially — making it the most complete AI brainstorming tool for people who think in maps, not lists.

**Q2 (h3):** `How do I avoid losing context in long AI conversations?`
**A:** The root cause of lost context isn't AI memory — it's the linear interface forcing everything into one sequential thread. Spaces solves this architecturally: every topic lives in its own node, so you never have to scroll past unrelated content to find what you need. Branch off a new node whenever a conversation deepens, and connect nodes when topics overlap. Your context stays spatial and visible, not buried.

**Q3 (h3):** `Can I use Spaces for team collaboration with AI?`
**A:** Yes — real-time multiplayer is built into Spaces from the ground up. Share an invite link and your collaborator joins the same canvas with their own colored cursor and username. Every node, every branch, and every connection syncs live. It's a true collaborative AI brainstorming board, not a read-only shared document.

**Q4 (h3):** `Is there an AI tool that works like a mind map?`
**A:** Spaces is the closest thing to a mind map AI tool that exists today. You start with a prompt, get an AI response as a card, then branch and connect cards across the canvas — exactly the structure of a mind map, but every card is a live AI conversation you can continue. You can also connect two unrelated cards and ask Spaces to find the connection between them, which no traditional mind map tool can do.

**Q5 (h3):** `How is Spaces different from Miro or FigJam?`
**A:** Miro and FigJam are visual collaboration tools designed for human-made content — sticky notes, shapes, and diagrams you draw yourself. Spaces is an AI-native canvas: every node is a live AI conversation you can continue, branch, and synthesize. The AI doesn't sit outside the canvas as a sidebar — it is the canvas. You can't replicate this with a Miro AI integration.

After the FAQ accordion, below it add a small paragraph for additional AEO signal (this paragraph is intentionally written for AI crawler comprehension):
`Spaces is an infinite canvas AI tool that replaces linear chat interfaces for knowledge work. It supports AI research assistants workflows, non-linear brainstorming, spatial note taking, visual knowledge mapping, and real-time collaborative AI sessions. Teams globally use Spaces to connect ideas across AI conversations and build structured knowledge from unstructured thinking.`
Style this as `font-size: 13px`, `color: #444455`, `max-width: 700px`, `margin: 40px auto 0`, `text-align: center`. It should read as a natural paragraph, not a keyword dump.

---

### SECTION 9: FINAL CTA

Background: `#13131a`. Padding `120px 0`. Centered.

A decorative element: small SVG of a red pin with a thread line curving away from it — positioned absolutely in the top-right of this section. Keep it subtle.

`<h2>`: `Start Thinking Spatially`
Font: Space Grotesk, 700, `clamp(32px, 4vw, 52px)`, `#e8e8ec`, text-align center.

Subtext:
`Your next breakthrough might be hiding in the connection between two ideas you haven't linked yet.`
Font: Inter, 17px, `#888899`, max-width 520px, centered.

CTA Button:
`Open your first canvas — it's free`
Background `#c0392b`, text white, font Space Grotesk weight 600, size 15px, padding `14px 32px`, border-radius `6px`.

Below button:
`No account needed to start · Works on any browser · Upgrade anytime`
Font-size 12px, color `#444455`.

---

### SECTION 10: FOOTER

Background `#0d0d14`. `border-top: 0.5px solid #1e1e2a`. Padding `48px 0 32px`.

Three columns on desktop, stacked on mobile:

Col 1 (35%):
Logo: `spaces•` same as navbar.
Tagline: `The infinite canvas AI workspace for non-linear thinkers.`
Font-size 13px, color `#555566`.

Col 2 (30%):
Label: `PRODUCT` (10px uppercase, `#555566`)
Links: Features / How It Works / Pricing / Changelog
Font-size 13px, color `#777788`.

Col 3 (35%):
Label: `CONNECT`
Links: Twitter/X / Product Hunt / GitHub / Contact
Font-size 13px, color `#777788`.

Bottom bar below all columns: `border-top: 0.5px solid #1e1e2a`, `padding-top: 20px`.
Left: `© 2026 Spaces. All rights reserved.`
Right: `Privacy Policy · Terms of Service`
Font-size 12px, color `#444455`.

**Footer SEO paragraph (critical — do not skip):**
Below the columns and above the bottom bar:
```
<p class="text-[11px] text-[#333344] text-center max-w-2xl mx-auto mb-6">
  Spaces is an AI thinking workspace — a visual, infinite canvas where knowledge workers, researchers, students, and remote teams connect ideas across AI conversations. Features include spatial note taking, collaborative AI brainstorming boards, non-linear AI conversation tools, AI mind mapping, and real-time multiplayer canvas editing.
</p>
```

---

## PERFORMANCE AND TECHNICAL REQUIREMENTS

- All sections use semantic HTML: `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`, `<main>`, `<h1>`–`<h3>`, `<p>`, `<ul>`, `<blockquote>`.
- Every `<img>` tag (if any) must have descriptive `alt` text containing a keyword.
- All anchor links (`<a>`) must have descriptive `aria-label` if the text alone is ambiguous.
- The FAQ accordion must have `aria-expanded` on each trigger and `role="region"` on each panel.
- Use `next/font` for both Inter and Space Grotesk — do not load from Google Fonts CDN directly.
- No `useEffect` for data fetching. The hero animation is the only `useEffect` allowed, and only for `setTimeout` chains.
- The hero animated canvas preview must respect `prefers-reduced-motion`. If the user has reduced motion enabled, show a static version of the canvas with all nodes visible immediately, no animation.
- All section padding uses Tailwind `py-20` or `py-24` — be consistent. Do not mix arbitrary values and Tailwind classes for the same property.
- The page must be fully responsive from `320px` to `1920px` width.
- Largest Contentful Paint target: the `<h1>` and the hero animated box must both be visible above the fold on a 1280×800 viewport without scrolling.

---

## WHAT NOT TO DO

- Do not use any white or light backgrounds anywhere on the page.
- Do not use gradient text on headings (it looks AI-generated and cheap).
- Do not use emoji in section headings — only in the teacher callout box in Section 7 where it is intentional.
- Do not add a pricing section — this page has no confirmed pricing tiers yet.
- Do not use `next/image` for the animated canvas preview — it is a pure HTML/CSS/React animation, not an image.
- Do not add a testimonials section — there are no real users yet and fake testimonials damage credibility.
- Do not use any external animation libraries (Framer Motion, GSAP, etc.) — only CSS transitions and vanilla JS via `useEffect`.
- Do not add cookie consent banners, chat widgets, or any third-party embeds to the page.
- Do not use `<br>` tags for spacing — use margin/padding.

---

## FILE STRUCTURE TO CREATE

```
app/
  page.tsx              ← main landing page
  layout.tsx            ← update with all meta tags and structured data
  globals.css           ← add dot-grid background pattern CSS, any React Flow overrides

components/
  landing/
    Navbar.tsx
    HeroSection.tsx     ← includes the animated canvas preview
    ProblemSection.tsx
    HowItWorksSection.tsx
    FeaturesSection.tsx
    WhoUsesSection.tsx
    HowToUseSection.tsx ← the kid-friendly section
    FAQSection.tsx
    CTASection.tsx
    Footer.tsx
```

Keep each component under 150 lines. If a component grows beyond that, extract a sub-component.

---

## FINAL CHECK BEFORE YOU MARK THIS DONE

Run through this checklist before finishing:

- [ ] One and only one `<h1>` on the page: `Infinite Canvas AI Workspace`
- [ ] All meta tags present and character-counted (title 50–60 chars, description 150–160 chars)
- [ ] Both JSON-LD schema blocks present in `<head>` (SoftwareApplication + FAQPage)
- [ ] Hero animated canvas preview loops and respects `prefers-reduced-motion`
- [ ] FAQ accordion is keyboard-navigable and has correct ARIA attributes
- [ ] Footer SEO paragraph present and unstyled enough to not be obvious keyword stuffing
- [ ] No white backgrounds anywhere
- [ ] No external font CDN calls — only `next/font`
- [ ] No placeholder "Lorem ipsum" text anywhere
- [ ] The word `Spaces` is spelled correctly and consistently (capital S, no hyphen)
- [ ] All five FAQ answers match exactly the copy in this prompt (these are AEO-tuned)
- [ ] The kid-friendly section (Section 7) uses only simple English — run each sentence and ask: could a 10-year-old understand this?
