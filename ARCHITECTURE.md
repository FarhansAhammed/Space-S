# ARCHITECTURE.md — Spaces

> This is the blueprint. Before writing any new module or modifying any existing one, check this file. If your change breaks a connection described here, it is wrong.

---

## 1. System Overview

```
Browser (React + React Flow)
        │
        ├── Canvas State (Zustand)
        │
        └── Next.js API Routes (/api/*)
                │
                ├── Anthropic API (text nodes, branches, merge, transcription)
                ├── fal.ai API (image generation)
                └── Supabase (auth via Clerk, board persistence)
```

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend framework | Next.js 14 (App Router) | Known from KCC project. API routes keep keys server-side. |
| Canvas library | React Flow (`reactflow`) | Handles nodes, edges, zoom, pan, drag. Not replaceable. |
| Global state | Zustand | One store for all canvas state. No prop drilling. |
| Styling | Tailwind CSS | Utility-first, fast iteration. |
| Auth | Clerk | Google OAuth, user management, free tier. |
| Database | Supabase (PostgreSQL) | Stores board state as JSONB. Free tier sufficient for MVP. |
| Text AI | Anthropic API (claude-sonnet-4-6) | All LLM calls route through here. |
| Image AI | fal.ai (flux-schnell model) | Cheap, fast, REST API. |
| Deployment | Vercel | Zero-config with Next.js. |

---

## 3. Frontend Architecture

### Component Tree

```
app/
├── layout.tsx                  — ClerkProvider wraps everything
├── page.tsx                    — Landing / redirect to /board
├── board/
│   └── [boardId]/
│       └── page.tsx            — Main canvas page
│
components/
├── Canvas/
│   ├── BoardCanvas.tsx         — React Flow root. Owns node/edge arrays.
│   ├── CanvasToolbar.tsx       — Bottom toolbar (node / image / upload / connect / pan)
│   └── Minimap.tsx             — Phase 4
│
├── Nodes/
│   ├── LLMNode.tsx             — Text response node. Has prompt input at bottom.
│   ├── BranchNode.tsx          — Child node from text selection. Visually connected.
│   ├── MergeNode.tsx           — Synthesis output. Purple border.
│   ├── ImageNode.tsx           — Image gen node. Shows skeleton while loading.
│   └── DocNode.tsx             — Transcribed upload node.
│
├── UI/
│   ├── SelectionMenu.tsx       — Appears on text selection: "Make branch" / "New node"
│   ├── ConnectionMenu.tsx      — Appears on edge: "Synthesize"
│   └── BoardSidebar.tsx        — Board list, create new board
│
store/
└── canvasStore.ts              — Zustand store (see Section 4)
```

### Node Data Shape

Every node in React Flow carries a `data` object. This is the contract — do not add fields without updating this definition.

```typescript
type NodeType = 'llm' | 'branch' | 'merge' | 'image' | 'doc';

interface NodeData {
  type: NodeType;
  title: string;           // short label shown in header
  content: string;         // text content (empty string for image nodes)
  imageUrl?: string;       // only for ImageNode
  imagePrompt?: string;    // only for ImageNode
  sourceFile?: string;     // only for DocNode — original filename
  isLoading: boolean;      // true while awaiting API response
  isCollapsed: boolean;    // shrink/expand toggle
  parentNodeId?: string;   // set on branch nodes
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}
```

---

## 4. State Management (Zustand)

Single store at `store/canvasStore.ts`. This is the only source of truth for canvas state.

```typescript
interface CanvasStore {
  // React Flow state
  nodes: Node<NodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Board meta
  boardId: string | null;
  boardName: string;
  isSaving: boolean;

  // Actions
  addLLMNode: (position: XYPosition, prompt: string) => Promise<void>;
  addBranchNode: (parentNodeId: string, selectedText: string) => Promise<void>;
  addMergeNode: (nodeIds: string[]) => Promise<void>;
  addImageNode: (position: XYPosition, prompt: string) => Promise<void>;
  addDocNode: (position: XYPosition, file: File) => Promise<void>;
  updateNodeContent: (nodeId: string, content: string) => void;
  deleteNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandNode: (nodeId: string) => void;
  continueConversation: (nodeId: string, prompt: string) => Promise<void>;
  saveBoardToSupabase: () => Promise<void>;
  loadBoardFromSupabase: (boardId: string) => Promise<void>;
}
```

**Rule:** React Flow node/edge state lives in Zustand, not in local React state. `BoardCanvas.tsx` reads from the store — it does not own state.

---

## 5. API Routes

All AI calls are server-side only. Never call Anthropic or fal.ai from the frontend directly.

### `POST /api/chat`
Handles LLM node creation and continue-conversation.

**Request:**
```json
{
  "messages": [{ "role": "user", "content": "string" }],
  "systemPrompt": "string | null"
}
```

**Response:** Streamed text (using Vercel AI SDK `StreamingTextResponse`).

**Used by:** `addLLMNode`, `addBranchNode`, `continueConversation`

---

### `POST /api/merge`
Handles cross-node synthesis. Sends all connected node contents as context.

**Request:**
```json
{
  "nodes": [
    { "title": "string", "content": "string" }
  ],
  "userPrompt": "string | null"
}
```

**Response:** Streamed text.

**Note:** This is the most expensive call. Contents of all connected nodes are concatenated. Cap at 5 nodes max to prevent token blowout.

---

### `POST /api/image`
Calls fal.ai to generate an image.

**Request:**
```json
{ "prompt": "string" }
```

**Response:**
```json
{ "imageUrl": "string" }
```

---

### `POST /api/transcribe`
Accepts a file upload (PDF or image), sends to Claude vision/document API, returns extracted text.

**Request:** `multipart/form-data` with `file` field.

**Response:**
```json
{ "text": "string", "filename": "string" }
```

**Supported types:** `application/pdf`, `image/jpeg`, `image/png`, `image/webp`

---

## 6. Database Schema (Supabase)

### Table: `boards`

```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,           -- Clerk user ID
  name TEXT NOT NULL DEFAULT 'Untitled Board',
  state JSONB NOT NULL DEFAULT '{}',  -- full React Flow nodes + edges JSON
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only read/write their own boards
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user owns board" ON boards
  USING (user_id = auth.uid()::text);
```

### `state` JSONB structure

```json
{
  "nodes": [ ...ReactFlow Node objects ],
  "edges": [ ...ReactFlow Edge objects ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

**Rule:** Never store sensitive data in `state`. It is a full serialized canvas snapshot. Keep it flat.

---

## 7. Data Flow — Key Scenarios

### User types a prompt on empty canvas

```
User clicks canvas → CanvasToolbar sets mode = 'node'
User clicks position → SelectionMenu shows prompt input at that position
User submits prompt
→ canvasStore.addLLMNode(position, prompt)
  → POST /api/chat { messages: [{ role: 'user', content: prompt }] }
  → Streaming response chunks update node content in real-time
  → On complete: canvasStore.saveBoardToSupabase()
```

### User selects text → creates branch

```
User selects text inside LLMNode
→ SelectionMenu appears (inline, not modal)
User clicks "Make branch"
→ canvasStore.addBranchNode(parentNodeId, selectedText)
  → Creates new node at (parentNode.x + 280, parentNode.y)
  → Creates edge from parent to new node
  → POST /api/chat { messages: [{ role: 'user', content: selectedText }] }
  → React Flow fitView() animates camera to include new node
  → On complete: save
```

### User connects 2 nodes → synthesize

```
User uses connect tool to draw edge between NodeA and NodeB
→ Edge created in React Flow
→ ConnectionMenu button "Synthesize" appears on edge midpoint
User clicks Synthesize
→ canvasStore.addMergeNode([nodeA.id, nodeB.id])
  → Collects content from both nodes
  → POST /api/merge { nodes: [{...}, {...}] }
  → New MergeNode created at midpoint between A and B
  → Streaming response fills MergeNode content
```

---

## 8. Environment Variables

```env
# Never expose these to the browser. All must start with no NEXT_PUBLIC_ prefix.
ANTHROPIC_API_KEY=
FAL_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=   # Clerk requires this to be public
CLERK_SECRET_KEY=
```

**Rule:** Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is allowed to be exposed to the browser. Every other key lives only in server-side API routes.

---

## 9. What This Architecture Does NOT Support

These are outside scope. Do not architect for them.

- WebSockets or real-time sync between users
- Server-side rendering of canvas state (canvas is 100% client-rendered)
- External plugin API
- Canvas state stored anywhere except Supabase `boards.state`
