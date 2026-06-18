# SYSTEM_PROMPT.md — Spaces (AI Coding Rules)

> This file governs how AI coding assistants must behave in this codebase. Every rule here exists because of a real failure mode. Read it before touching any file.

---

## Identity of This Project

You are working on **space-S** — an infinite canvas LLM web app built with Next.js 14, React Flow, Zustand, Tailwind, Clerk, Supabase, and the Anthropic API. The full architecture is defined in `ARCHITECTURE.md`. Read it first. If a user request would require changing the architecture, say so explicitly before writing code.

---

## Absolute Rules (Never Violate)

### Security
- **Never** place API keys directly in any component, hook, or client-side file.
- All Anthropic, fal.ai, and Supabase service role calls happen exclusively inside `/app/api/` route handlers.
- The only environment variable allowed in browser-accessible code is `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- Never log request bodies that may contain user content in production code.
- Always validate file type and size on the server in `/api/transcribe` before passing to Claude. Reject anything that isn't PDF, JPEG, PNG, or WEBP. Reject files above 10MB.

### State Management
- **Never** use `useState` to manage node or edge data. That lives in Zustand (`canvasStore`).
- **Never** pass nodes or edges as props through more than one component level. Read from the store directly.
- **Never** mutate Zustand state outside of store actions. Components call actions; they do not reach into state directly.

### React Flow
- **Never** replace React Flow with a custom canvas implementation. If something seems hard to do in React Flow, look for the React Flow way first.
- Always use `noWheelClassName="no-canvas-wheel"` on node inner containers that should scroll independently. Never hack this with `e.stopPropagation()` manually.
- Always use `nodesDraggable`, `nodesConnectable`, and similar props at the `ReactFlow` root level — not per-node.

### AI API Calls
- **Never** call the Anthropic API or fal.ai from the client side under any circumstances.
- All streaming responses from `/api/chat` and `/api/merge` must use Vercel AI SDK `StreamingTextResponse`. Do not buffer and return the full response.
- **Never** preload or trigger any AI call on component mount. All calls are user-initiated.
- The "Explain" feature on nodes must only fire when the user explicitly clicks the Explain button. No preloading.
- Always send `max_tokens: 1000` for node generation calls. For merge/synthesis calls, use `max_tokens: 2000`.
- Always include a system prompt in API calls: `"You are a concise thinking partner. Respond clearly and directly. Do not use unnecessary preamble."` unless the route has a specific override.

### Database
- **Never** store individual field updates to Supabase in real time. Debounce saves with a 2-second delay after the last change.
- The entire canvas state is serialized to `boards.state` as a single JSONB write. Never create separate tables for nodes or edges.
- Always use Supabase Row Level Security. Never bypass RLS with the service role key except in verified server-side admin operations.

---

## Code Style Rules

### TypeScript
- Strict mode is on. Never use `any`. If you don't know the type, use `unknown` and narrow it.
- All React components are typed with explicit prop interfaces. No implicit `{}` props.
- All Zustand actions are defined in the store interface before implementation.
- Never use `// @ts-ignore` or `// @ts-expect-error` without a comment explaining exactly why.

### Naming
- Components: PascalCase. Files match component name. `LLMNode.tsx` exports `LLMNode`.
- Store actions: camelCase verbs. `addLLMNode`, `deleteNode`, `saveBoardToSupabase`.
- API routes: kebab-case folders. `/api/chat`, `/api/merge`, `/api/transcribe`.
- CSS classes: Tailwind only. No custom CSS files except for React Flow canvas overrides in `globals.css`.

### Component Rules
- No component file exceeds 200 lines. If it does, extract a sub-component.
- No inline functions in JSX that contain more than 3 lines of logic. Extract to a named handler.
- No `useEffect` for data fetching. API calls are triggered by user actions inside store actions, not effects.
- Never use `<form>` elements. Use `onClick` / `onKeyDown` handlers instead.

### Error Handling
- Every API route must have a try/catch. On error, return `{ error: string }` with the appropriate HTTP status code.
- Every store action that calls an API must set `node.data.isLoading = true` before the call and `false` after, in both success and error paths.
- Never let a failed API call leave a node in a permanent loading state. Always reset `isLoading`.

---

## What You Should Suggest

- If a feature request isn't in `PRODUCT_REQUIREMENTS.md`, flag it and ask before implementing.
- If a proposed change would alter the database schema, show the migration SQL before touching any code.
- If a new API route is needed, define the request/response shape in a comment at the top of the file before writing the handler logic.
- Prefer existing utilities and abstractions over new ones. Check `store/canvasStore.ts` before writing new state logic.

## What You Must Never Suggest

- Adding a new state management library (no Redux, no Jotai, no Context API for canvas state).
- Replacing Supabase with Firebase or any other database.
- Replacing Clerk with a custom auth system.
- Adding real-time collaboration features.
- Adding a native mobile app layer.
- Splitting the Next.js app into a separate frontend + backend. It stays monorepo.
- Any `localStorage` usage for canvas state. Supabase is the only persistence layer.

---

## React Flow Specific Rules

```typescript
// CORRECT — scroll isolation on node content
<div className="no-canvas-wheel overflow-y-auto max-h-48">
  {node.data.content}
</div>

// WRONG — never do this
<div onWheel={(e) => e.stopPropagation()}>
  {node.data.content}
</div>
```

```typescript
// CORRECT — position new branch node relative to parent
const branchPosition = {
  x: parentNode.position.x + (parentNode.width ?? 240) + 60,
  y: parentNode.position.y,
};

// WRONG — hardcoding canvas coordinates
const branchPosition = { x: 500, y: 300 };
```

---

## Performance Rules

- Node content is rendered as plain text inside a scrollable div — never as `dangerouslySetInnerHTML`.
- Images in ImageNodes use `next/image` with explicit `width` and `height`.
- Board saves are debounced 2 seconds. Never save on every keystroke.
- Synthesis/merge calls are capped at 5 source nodes. If more than 5 are connected, take the 5 most recently created.
- Do not import the entire `lodash` library. Use individual function imports: `import debounce from 'lodash/debounce'`.
