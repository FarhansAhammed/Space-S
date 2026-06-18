# ROADMAP.md — Spaces

> Feed the AI one phase at a time. Never jump to Phase 2 tasks while Phase 1 has unchecked boxes.

---

## Phase 1 — Foundation (Weeks 1–2)
*Goal: A working canvas where you can create text nodes and they persist. Nothing AI yet.*

### 1.1 Project Setup
- [ ] Init Next.js 14 with App Router and TypeScript strict mode
- [ ] Install and configure Tailwind CSS
- [ ] Install Clerk, wrap `layout.tsx` with `ClerkProvider`
- [ ] Set up Clerk Google OAuth in dashboard
- [ ] Create Supabase project, copy URL and service role key to `.env.local`
- [ ] Create `boards` table with RLS (SQL from `ARCHITECTURE.md` Section 6)
- [ ] Install `reactflow`, `zustand`, `@supabase/supabase-js`, `@clerk/nextjs`
- [ ] Set up `.cursorrules` pointing to `SYSTEM_PROMPT.md` rules

### 1.2 Auth Flow
- [ ] `/` route: if logged in → redirect to `/board/[mostRecentBoardId]`, else show landing
- [ ] Sign in page using Clerk's `<SignIn />` component
- [ ] Middleware protecting `/board/*` routes

### 1.3 Canvas Shell
- [ ] `BoardCanvas.tsx` renders `<ReactFlow>` with dark background
- [ ] Dotted grid background using React Flow `<Background variant="dots" />`
- [ ] Zoom and pan working on empty canvas
- [ ] `CanvasToolbar.tsx` — bottom bar with: Node, Image, Upload, Connect, Pan buttons (not wired yet)
- [ ] `BoardSidebar.tsx` — left panel: board list, "New Board" button (not wired yet)

### 1.4 Zustand Store
- [ ] `canvasStore.ts` created with full interface from `ARCHITECTURE.md` Section 4
- [ ] `nodes`, `edges`, `onNodesChange`, `onEdgesChange`, `onConnect` wired to `<ReactFlow>`
- [ ] `addLLMNode` action: adds a placeholder node (no API call yet, hardcode content as "...")
- [ ] `deleteNode` action working
- [ ] `collapseNode` / `expandNode` actions working

### 1.5 LLMNode Component
- [ ] `LLMNode.tsx` renders title, content, action buttons (Shrink/Expand/Delete)
- [ ] Node content area has `no-canvas-wheel` class — scroll isolation verified manually
- [ ] Prompt input at bottom of node (not wired to API yet)
- [ ] Node drag-to-reposition working (React Flow default)
- [ ] Collapsed state renders only title bar

### 1.6 Board Persistence
- [ ] `saveBoardToSupabase` action: serializes nodes + edges + viewport to `boards.state` JSONB
- [ ] `loadBoardFromSupabase` action: deserializes and hydrates React Flow state
- [ ] Auto-save debounced 2 seconds after last node change
- [ ] On page load, board state is fetched and restored
- [ ] New board creation: inserts row in `boards`, redirects to `/board/[newId]`

**Phase 1 is complete when:** You can open the app, log in, create a (static) node by clicking the canvas, drag it around, close the tab, reopen, and see it exactly where you left it.

---

## Phase 2 — AI Core (Weeks 2–3)
*Goal: Nodes respond to prompts. Branching works. This is the heart of the product.*

### 2.1 LLM API Route
- [ ] `POST /api/chat` created with streaming response (Vercel AI SDK)
- [ ] System prompt: `"You are a concise thinking partner. Respond clearly and directly."`
- [ ] `ANTHROPIC_API_KEY` loaded from env, never exposed to client
- [ ] Error handling: returns `{ error }` on failure with 500 status
- [ ] Manual test with curl before wiring to frontend

### 2.2 Prompt → Node (Live)
- [ ] Click empty canvas → inline prompt input appears at cursor position
- [ ] Submit prompt → `canvasStore.addLLMNode(position, prompt)` fires
- [ ] Node appears immediately with `isLoading: true` and spinner
- [ ] Streaming chunks update `node.data.content` in real-time via Zustand
- [ ] `isLoading: false` on stream complete or error
- [ ] Node sizes to content height after response

### 2.3 Continue Conversation Inside Node
- [ ] Bottom prompt input in `LLMNode` is wired to `canvasStore.continueConversation`
- [ ] `conversationHistory` array on node is updated with each turn
- [ ] Full conversation history sent with each `/api/chat` call for that node
- [ ] Multi-turn conversation works correctly (context preserved)

### 2.4 Text Selection → Branch
- [ ] Text selection inside node triggers `SelectionMenu.tsx` (inline, not modal)
- [ ] Menu shows: "Make branch" button
- [ ] `canvasStore.addBranchNode(parentNodeId, selectedText)` fires on click
- [ ] Branch node created to the right of parent at calculated position
- [ ] Edge created between parent and branch node (visible line)
- [ ] React Flow `fitView` animates camera to include new branch node
- [ ] Branch sends selected text as the prompt to `/api/chat`
- [ ] `BranchNode.tsx` is visually distinct (slightly different header color)

### 2.5 Lazy Explain
- [ ] "Explain" button on each node — does NOT fire on render
- [ ] On click: fires `/api/chat` with content as context + `"Explain this in plain terms"`
- [ ] Creates a new branch node with the explanation
- [ ] Button shows loading state while in flight

**Phase 2 is complete when:** You can prompt the canvas, get a real AI response, select a word in the answer, branch it into a new node, and continue asking questions in each node independently.

---

## Phase 3 — Synthesis & Media (Weeks 3–4)
*Goal: Cross-node merge and file uploads. The features that make this more than a fancy chat.*

### 3.1 Node Connection
- [ ] "Connect" tool in toolbar enables connection drawing mode
- [ ] User drags from one node handle to another to create an edge
- [ ] Edge is styled as a dashed thread line (not React Flow default)
- [ ] `ConnectionMenu.tsx` appears on edge midpoint with "Synthesize" button

### 3.2 Cross-Node Merge
- [ ] `POST /api/merge` route created
- [ ] Collects content from all connected nodes (capped at 5)
- [ ] System prompt: `"You are synthesizing multiple ideas. Find connections, tensions, and emergent insights between them."`
- [ ] `canvasStore.addMergeNode([...nodeIds])` creates `MergeNode` at midpoint of connected nodes
- [ ] `MergeNode.tsx` has distinct purple border, "merged synthesis" label
- [ ] Streaming response fills merge node

### 3.3 Image Generation
- [ ] `POST /api/image` route calls fal.ai `flux-schnell` model
- [ ] `FAL_KEY` loaded from env, never exposed to client
- [ ] Image tool in toolbar: click → inline prompt input
- [ ] `canvasStore.addImageNode(position, prompt)` fires
- [ ] `ImageNode.tsx` shows skeleton loader while generating
- [ ] Image renders inside node at fixed width after response
- [ ] "Regen" button re-fires same prompt

### 3.4 Document & Image Upload
- [ ] Upload tool in toolbar: click → file picker (PDF, JPEG, PNG, WEBP, max 10MB)
- [ ] `POST /api/transcribe` validates file type and size server-side
- [ ] File sent to Claude vision/document API
- [ ] `canvasStore.addDocNode(position, file)` creates node
- [ ] `DocNode.tsx` shows filename header, transcribed text content, "view raw" toggle

**Phase 3 is complete when:** You can connect a black hole node to a Camus philosophy node, hit Synthesize, and get a response that meaningfully bridges both.

---

## Phase 4 — Polish (Week 5)
*Cut scope ruthlessly. Only do this if Phases 1–3 are solid.*

- [ ] Keyboard shortcuts: `N` for new node, `Delete` to delete selected, `Escape` to cancel
- [ ] Minimap in corner for large boards (`<MiniMap />` from React Flow)
- [ ] Board rename (click board title to edit inline)
- [ ] Export board as PNG (React Flow `getViewport` + html-to-image)
- [ ] Public share link (set `boards.is_public = true`, read-only view at `/share/[boardId]`)
- [ ] Empty state on new board: placeholder text `"click anywhere to start thinking"`
- [ ] Loading skeleton when board is being fetched

---

## Known Risks (Be Honest With Yourself)

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Scroll isolation breaking on some browsers | High | Test Chrome, Firefox, Safari before Phase 2 |
| Synthesis call too slow (large contexts) | High | Show animated loading state, cap nodes at 5 |
| Board state JSONB growing too large | Medium | Warn user if board exceeds 500 nodes |
| fal.ai rate limits during testing | Low | Use fal.ai's sandbox/test mode |
| React Flow performance with 50+ nodes | Medium | Enable `only-render-visible-elements` prop |
| Zustand store getting out of sync with React Flow | High | Keep strict rule: React Flow reads only from Zustand |

---

## What Not To Build Next

After Phase 4, the tempting wrong moves are:

- **Adding collaboration** — requires WebSockets, presence, CRDTs. Months of work. Validate solo first.
- **Mobile app** — the canvas interaction model doesn't translate to touch without a full redesign.
- **Plugin marketplace** — no users yet. Don't build infrastructure for scale before you have scale.

The right next move after Phase 4 is: get 10 real users, watch them use it, and let their confusion tell you what Phase 5 should be.
