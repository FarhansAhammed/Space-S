# PRODUCT_REQUIREMENTS.md — Spaces

> A free-form AI canvas where thinking is non-linear and connections between ideas generate new ones.

---

## 1. Product Vision

Spaces is an infinite canvas web app where users prompt an LLM and the response appears as a positioned node on a board. Nodes can be branched, connected, merged for cross-topic synthesis, and supplemented with images and uploaded documents. The board is persistent, shareable, and feels like a working crime board — messy, dense, and alive.

**The one thing it must do better than everything else:** make the act of connecting two unrelated ideas feel productive, not chaotic.

---

## 2. Target Users

| User | Description |
|------|-------------|
| Primary | Solo researchers, writers, students who think non-linearly |
| Secondary | Developers / founders using it as a project thinking tool |
| Not targeting (v1) | Teams, enterprise, real-time collaboration |

---

## 3. User Stories

### Authentication
- As a user, I can sign up and log in with Google OAuth so I don't need to manage a password.
- As a user, my boards are private by default and tied to my account.
- As a user, I can access my boards from any device after logging in.

### Canvas & Navigation
- As a user, I can scroll/pinch to zoom in and out of the canvas when my cursor is outside any node.
- As a user, when my cursor is inside a node, scrolling scrolls the node's content — not the canvas.
- As a user, I can pan the canvas by clicking and dragging empty space.
- As a user, the canvas state (node positions, zoom level, pan position) is auto-saved so I never lose my layout.

### Nodes — LLM Text
- As a user, I can open a prompt input anywhere on the canvas and type a question. The answer appears as a new node at that position, sized to its content.
- As a user, each node has a persistent prompt input at the bottom so I can continue the conversation inside that node.
- As a user, I can shrink a node to a compact title-only card or expand it to full content.
- As a user, I can drag any node to reposition it on the canvas.
- As a user, I can delete a node.

### Nodes — Branching
- As a user, I can select a portion of text inside a node. A context menu appears with the option "Make branch."
- As a user, clicking "Make branch" creates a new child node connected to the parent by a visible thread line, positioned to the side, with the selected text sent as the prompt.
- As a user, the camera smoothly pans to bring the new branch node into view.
- As a user, I can collapse a branch back into the parent node.

### Nodes — Explain (Lazy Load)
- As a user, I can click "Explain" on any node. This does NOT preload anything — the API call only fires when I click.
- As a user, the explanation appears in a new branch node connected to the original.

### Nodes — Connection & Merge
- As a user, I can draw a connection line between any two or more nodes using a connect tool.
- As a user, once nodes are connected, a "Synthesize" button appears on the connection. Clicking it sends all connected node contents to the LLM and creates a new merge node with a combined answer.
- As a user, the merge node is visually distinct (different border color) from regular nodes.

### Nodes — Image Generation
- As a user, I can create an image node by clicking the image tool, typing a prompt, and clicking generate.
- As a user, the image appears inside the node on the canvas.
- As a user, I can regenerate the image with the same or a modified prompt.

### Nodes — Document & Image Upload
- As a user, I can upload a PDF or image file to the canvas.
- As a user, the uploaded file is automatically transcribed by the AI and the result appears as a regular text node.
- As a user, the node shows the original filename and a "view raw" toggle.

### Boards
- As a user, I can create multiple boards and switch between them.
- As a user, I can name and rename boards.
- As a user, each board has its own independent canvas state.

---

## 4. Features List (Prioritized)

### Phase 1 — Core (MVP)
- [x] Google OAuth login
- [x] Infinite canvas with zoom and pan
- [x] LLM text nodes (prompt → answer as node)
- [x] Node scroll isolation (wheel inside node ≠ zoom canvas)
- [x] Node resize (shrink / expand)
- [x] Node drag and reposition
- [x] Node deletion
- [x] Text selection → branch node
- [x] Camera pan to new branch
- [x] Board persistence (Supabase)
- [x] Multiple boards per user

### Phase 2 — Intelligence Layer
- [ ] Lazy-load "Explain" per node
- [ ] Node connection drawing
- [ ] Cross-node synthesis / merge
- [ ] Merge node visual distinction

### Phase 3 — Media
- [ ] Image generation nodes (fal.ai)
- [ ] PDF upload → transcription node
- [ ] Image upload → transcription node

### Phase 4 — Polish
- [ ] Keyboard shortcuts
- [ ] Minimap for large boards
- [ ] Export board as image / PDF
- [ ] Public board sharing via link

---

## 5. Explicit Non-Features (v1)

These will not be built. If the AI suggests them, reject the code.

- Real-time multiplayer / collaboration
- Comments or annotations on nodes
- Node versioning or history
- Mobile app (PWA is fine, but not native)
- Offline mode
- Voice input
- Plugin system

---

## 6. UX Constraints

- Canvas background: dark, dotted grid. Not white.
- Node scroll isolation is non-negotiable. Use React Flow's `noWheelClassName`.
- No node should auto-generate content on load. All AI calls are user-triggered.
- Merge/Synthesize must show a loading state — these calls will be slow (large context).
- Image generation nodes must show a skeleton loader while generating.
- No modal dialogs. All interactions happen inline on the canvas.

---

## 7. Success Metrics (MVP)

- User creates at least 3 nodes in first session
- User triggers at least 1 branch in first session
- Session length > 8 minutes
- Board save/load round-trip < 2 seconds
