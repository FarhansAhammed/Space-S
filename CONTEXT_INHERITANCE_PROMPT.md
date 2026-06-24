# IMPLEMENTATION PROMPT — Context-Aware Branch Nodes
# Feature: Automatic parent context inheritance for child/branch nodes
# Project: Spaces (infinite canvas AI app)
# File: Add to existing implementation alongside ARCHITECTURE.md and SYSTEM_PROMPT.md

---

## THE PROBLEM THIS SOLVES

When a user selects a word or phrase from a parent node and creates a branch node,
the selected text is currently sent to the LLM as a raw prompt with no surrounding
context. This causes context collapse:

- Parent node talks about OSI network layers
- User selects the word "Physical"
- Child node gets asked about "Physical" with no context
- LLM answers about physical exercise, physical matter, or physical science
- The answer is completely wrong for the user's actual intent

The correct behavior: the child node should know it was spawned from a parent
talking about OSI network layers, and answer "Physical" as "Physical Layer (Layer 1)
of the OSI model" — without the user having to re-explain anything.

This feature is called **Context Inheritance**. Every branch node must carry
the semantic context of its parent, automatically extracted and injected into
the system prompt of the child node's API call.

---

## HOW IT WORKS — CONCEPTUAL OVERVIEW

Before writing any code, understand the three-layer system you are building:

**Layer 1 — Context Extraction**
When a branch node is created, before calling the API, extract a "context
fingerprint" from the parent node. This is NOT the full parent content (too
long, too expensive). It is a compact semantic summary: the domain, the topic
cluster, and the key entities in the parent's content. This extraction itself
is a lightweight LLM call, or can be done with a simple heuristic approach
(first, try heuristic — fall back to LLM extraction only if heuristic fails).

**Layer 2 — Context Inheritance Chain**
Every node has a `contextChain` — an ordered list of topic/domain summaries
from all ancestors, not just the direct parent. If the user branches from a
branch from a branch, the context chain passes down through all generations,
getting progressively more specific. The chain is capped at 3 levels deep to
avoid token bloat.

**Layer 3 — System Prompt Injection**
When the child node calls `/api/chat`, the extracted context is injected into
the system prompt as a scoped constraint: the LLM is told exactly what domain
and topic context it is operating inside, before it sees the user's selected
term.

---

## WHAT TO BUILD

### 1. Update the `NodeData` interface in `store/canvasStore.ts`

Add these fields to the existing `NodeData` interface:

```typescript
interface NodeData {
  // ... existing fields ...

  // NEW — context inheritance
  contextSummary: string | null;
  // A compact 1-3 sentence summary of what THIS node is about,
  // extracted after the node's content is generated.
  // Used by CHILD nodes to inherit context from this node.
  // Null until the node's content has been fully generated.

  contextChain: ContextEntry[];
  // Ordered array from root ancestor to direct parent.
  // Each entry summarizes one ancestor's domain/topic.
  // Capped at 3 entries (trim oldest when adding new ones).
}

interface ContextEntry {
  nodeId: string;
  summary: string;
  // Format: "[DOMAIN]: [TOPIC]. Key entities: [comma-separated list]"
  // Example: "Computer Networking: OSI Model layers and their functions.
  //           Key entities: Physical Layer, Data Link, Network, Transport,
  //           Session, Presentation, Application."
}
```

---

### 2. Create a new utility: `lib/extractContext.ts`

This file handles extracting a compact context summary from a node's content.

```typescript
// lib/extractContext.ts
// Extracts a context fingerprint from node content.
// Tries heuristic first. Falls back to LLM if heuristic confidence is low.

export async function extractContextSummary(
  nodeContent: string,
  nodeTitle: string
): Promise<string>
```

**Heuristic approach (try this first — no API call, instant):**

1. Take the first 400 characters of `nodeContent`.
2. Strip markdown, bullet points, and formatting.
3. Extract the first sentence as the "topic sentence."
4. Look for domain signals: does the content contain domain-specific vocabulary?
   Use a lightweight keyword matching approach against a small hardcoded domain
   map:
   ```typescript
   const DOMAIN_SIGNALS: Record<string, string[]> = {
     "Computer Networking": ["OSI", "TCP/IP", "layer", "protocol", "packet",
       "bandwidth", "latency", "router", "switch", "subnet", "IP address",
       "MAC address", "ethernet", "HTTP", "DNS"],
     "Machine Learning": ["model", "training", "neural network", "dataset",
       "epoch", "gradient", "loss function", "inference", "embedding",
       "transformer", "parameter", "weight"],
     "Biology": ["cell", "DNA", "RNA", "protein", "organism", "gene",
       "chromosome", "metabolism", "enzyme", "nucleus", "mitosis"],
     "Philosophy": ["consciousness", "ethics", "epistemology", "ontology",
       "Kant", "Plato", "Aristotle", "phenomenology", "logic", "a priori"],
     "Finance": ["equity", "bond", "derivative", "portfolio", "hedge",
       "yield", "dividend", "capital", "liquidity", "leverage", "arbitrage"],
     "Physics": ["quantum", "relativity", "photon", "electron", "force",
       "momentum", "entropy", "wavelength", "particle", "field", "mass"],
     "Chemistry": ["molecule", "atom", "compound", "reaction", "element",
       "bond", "valence", "oxidation", "catalyst", "polymer", "ion"],
     "Law": ["statute", "liability", "jurisdiction", "plaintiff", "defendant",
       "contract", "tort", "precedent", "constitution", "amendment"],
     "Medicine": ["diagnosis", "symptom", "treatment", "pathology", "clinical",
       "therapy", "dosage", "prognosis", "anatomy", "pharmacology"],
     "Economics": ["supply", "demand", "inflation", "GDP", "monetary policy",
       "fiscal", "market", "elasticity", "utility", "aggregate"],
   };
   ```
5. Score each domain by how many of its signal words appear in the content.
   Take the domain with the highest score (minimum score of 2 to qualify).
6. Build the context summary string:
   `"[DETECTED_DOMAIN]: [FIRST_SENTENCE]. Key entities: [top 5 nouns found in content that appear in the domain signals list]."`

**If heuristic confidence is low (score < 2 for all domains, OR content is
under 80 characters):**

Fall back to an LLM extraction call via `POST /api/extract-context`:

```
System prompt: "You are a context classifier. Given a piece of text, extract:
1. The specific domain or field this text belongs to (be specific — not just
   'science' but 'Quantum Physics' or 'Organic Chemistry').
2. The specific topic within that domain.
3. A comma-separated list of the 3-5 most important named concepts or entities.

Respond ONLY in this exact format, nothing else:
DOMAIN: [domain]
TOPIC: [specific topic]
ENTITIES: [entity1, entity2, entity3]"

User message: [first 600 chars of node content]
```

Parse the response and construct the context summary string in the same format
as the heuristic output.

**Important:** This extraction call uses `max_tokens: 150`. It is fast and cheap.
Do NOT stream this response — await the full response before continuing.

---

### 3. Create the new API route: `POST /api/extract-context`

Location: `app/api/extract-context/route.ts`

```typescript
// Accepts: { content: string, title: string }
// Returns: { contextSummary: string }

// System prompt as defined above.
// Model: claude-haiku-3 (cheapest, this is a utility call not a thinking call)
// max_tokens: 150
// No streaming.
// Wrap in try/catch. On failure, return a fallback:
// { contextSummary: `General context: ${title}` }
// Never let a failed context extraction break the branch node creation flow.
```

---

### 4. Update `canvasStore.ts` — `addBranchNode` action

This is the core change. Update the existing `addBranchNode` action to:

**Step 1 — Build the context chain for the new child node:**

```typescript
// Get parent node from state
const parentNode = get().nodes.find(n => n.id === parentNodeId);
if (!parentNode) return;

// Build context chain: parent's chain + parent's own context summary
const parentContextChain = parentNode.data.contextChain ?? [];
const parentContextSummary = parentNode.data.contextSummary;

let childContextChain: ContextEntry[] = [];

if (parentContextSummary) {
  // Add parent's summary to the chain
  const newEntry: ContextEntry = {
    nodeId: parentNodeId,
    summary: parentContextSummary,
  };
  // Combine: take existing chain + new entry, keep last 3 only
  childContextChain = [...parentContextChain, newEntry].slice(-3);
} else {
  // Parent context not extracted yet (edge case: branch created before
  // parent content finished streaming). Use parent's raw content first 300 chars
  // as a fallback inline context.
  childContextChain = parentContextChain;
}
```

**Step 2 — Create the child node with the context chain:**

```typescript
// Create the branch node as before, but now include:
const newNode = {
  // ... existing node creation ...
  data: {
    // ... existing data fields ...
    contextChain: childContextChain,
    contextSummary: null, // will be extracted after content is generated
  }
};
```

**Step 3 — Call `/api/chat` with context-aware system prompt:**

Build the system prompt for the branch node call by injecting the context chain:

```typescript
function buildContextAwareSystemPrompt(
  contextChain: ContextEntry[],
  selectedText: string
): string {
  if (contextChain.length === 0) {
    // No parent context — standard system prompt
    return "You are a concise thinking partner. Respond clearly and directly. Do not use unnecessary preamble.";
  }

  // Build context description from chain
  const contextDescription = contextChain
    .map((entry, i) => {
      if (i === contextChain.length - 1) {
        return `Direct parent context: ${entry.summary}`;
      }
      return `Ancestor context (${i + 1} level up): ${entry.summary}`;
    })
    .join("\n");

  return `You are a concise thinking partner operating inside a specific knowledge context.

CONTEXT INHERITED FROM PARENT NODES:
${contextDescription}

CRITICAL INSTRUCTION: The user has selected the term "${selectedText}" from content 
about the above topic. Your response MUST interpret "${selectedText}" within this 
specific context, NOT in its general everyday meaning.

For example: if the context is about computer networking and the user selected 
"physical", answer about the Physical Layer (Layer 1) of the OSI model — not about 
physical matter, physical fitness, or any other meaning of the word.

If the selected term has a specific technical meaning within the inherited context, 
use that meaning exclusively. If the term appears in the context's key entities list, 
anchor your answer to that exact usage.

Respond clearly and directly. Start your answer with the term defined in context, 
then expand. Do not use unnecessary preamble. Do not ask for clarification.`;
}
```

Pass this as the `systemPrompt` field in the `/api/chat` request body.

**Step 4 — After the branch node content finishes streaming, extract its context:**

```typescript
// After streaming completes (in the same addBranchNode action,
// after the fetch resolves):

// Extract context summary for THIS new node (so ITS children can inherit from it)
const extractedSummary = await extractContextSummary(
  fullGeneratedContent,  // the complete streamed text
  newNode.data.title
);

// Update the node in state with its extracted context summary
get().updateNodeContextSummary(newNodeId, extractedSummary);
// Also save to Supabase nodes table: UPDATE nodes SET context_summary = $1 WHERE id = $2
```

---

### 5. Add `updateNodeContextSummary` action to the store

```typescript
updateNodeContextSummary: (nodeId: string, summary: string) => {
  set(state => ({
    nodes: state.nodes.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, contextSummary: summary } }
        : n
    )
  }));
  // Also persist to Supabase
  supabase
    .from('nodes')
    .update({ context_summary: summary })
    .eq('id', nodeId);
}
```

---

### 6. Update the `nodes` table in Supabase

Add one column to the existing `nodes` table:

```sql
ALTER TABLE nodes ADD COLUMN context_summary TEXT;
ALTER TABLE nodes ADD COLUMN context_chain JSONB DEFAULT '[]'::jsonb;
```

`context_summary`: extracted summary of this node's content (used by its children).
`context_chain`: the inherited chain from all ancestors (used when loading the node
to restore context on page refresh).

When loading a canvas from Supabase (`loadBoardFromSupabase`), ensure these fields
are read back into `NodeData` correctly. They are stored at rest and do not need
to be re-extracted on load.

---

### 7. Update `/api/chat` route to accept and use `systemPrompt`

The existing `/api/chat` route likely uses a hardcoded system prompt. Update it
to accept an optional `systemPrompt` field in the request body:

```typescript
// In /api/chat/route.ts
const { messages, systemPrompt } = await request.json();

const FALLBACK_SYSTEM_PROMPT = "You are a concise thinking partner. Respond clearly and directly. Do not use unnecessary preamble.";

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1000,
  system: systemPrompt ?? FALLBACK_SYSTEM_PROMPT,
  messages,
  stream: true,
});
```

This change is backward-compatible: all existing calls that don't pass `systemPrompt`
will continue to use the fallback. Only branch node calls pass a context-aware system prompt.

---

### 8. Visual indicator on context-inherited nodes

When a branch node has a non-empty `contextChain`, show a subtle visual indicator
so the user knows context was inherited:

In `BranchNode.tsx`, below the node header, add a small collapsible context badge:

```tsx
{node.data.contextChain.length > 0 && (
  <div className="flex items-center gap-1.5 mb-2 cursor-pointer group"
       onClick={() => setContextVisible(!contextVisible)}>
    <div className="w-1.5 h-1.5 rounded-full bg-[#7878c8]" />
    <span className="text-[10px] text-[#555577] group-hover:text-[#7878c8] transition-colors">
      Context from parent
    </span>
    <span className="text-[10px] text-[#333355]">
      {contextVisible ? '▲' : '▼'}
    </span>
  </div>
)}

{contextVisible && (
  <div className="bg-[#14141e] border border-[#2a2a3a] rounded-md p-2 mb-2 text-[10px] text-[#555577] leading-relaxed">
    {node.data.contextChain.map((entry, i) => (
      <div key={entry.nodeId}>
        {i === node.data.contextChain.length - 1 ? '↳ ' : '· '}
        {entry.summary}
      </div>
    ))}
  </div>
)}
```

This lets users see exactly what context was inherited without it being intrusive
by default (collapsed). They can expand it if the answer seems off.

---

### 9. Handle the "continue conversation inside node" case

When a user continues a conversation INSIDE a branch node (using the bottom
prompt input of an existing node), the context chain should also be passed.
The `continueConversation` action should pass the node's own `contextChain`
as part of the system prompt for that node's ongoing conversation — not just
on initial creation.

Update `continueConversation` in `canvasStore.ts` to also call
`buildContextAwareSystemPrompt(node.data.contextChain, "")` and pass it
as `systemPrompt` to `/api/chat`. For continue-conversation calls, the
`selectedText` parameter in the system prompt builder should be empty string
(the user is typing their own full question, not branching from a selected word).

---

## EXAMPLE WALKTHROUGH — VERIFY THIS WORKS

After implementation, manually test this exact scenario:

1. Create a root node with prompt: `"Explain the layers of the OSI model"`
   - Content will mention: Physical, Data Link, Network, Transport, Session,
     Presentation, Application layers
   - After content generates, `contextSummary` should be extracted as something
     like: `"Computer Networking: OSI Model and its seven layers. Key entities:
     Physical Layer, Data Link Layer, Network Layer, Transport Layer, Session
     Layer, Presentation Layer, Application Layer."`

2. Select the word `"Physical"` from that node and create a branch node
   - The branch API call should use the context-aware system prompt
   - The system prompt should contain the parent's context summary
   - The LLM should respond about the Physical Layer (Layer 1), covering:
     hardware, cables, electrical signals, bit transmission, NICs, hubs
   - It should NOT mention physical fitness, physical matter, or any other
     meaning of "physical"

3. From the Physical Layer branch node, select the word `"signal"` and branch again
   - The context chain now has TWO entries: OSI Model context + Physical Layer context
   - The system prompt should reference both
   - The LLM should answer about electrical/optical signals in networking
   - NOT about traffic signals, body language signals, or any other meaning

4. Verify that a ROOT node (no parent) with just the word `"Physical"` as the
   prompt gets a general answer — confirming that context injection only happens
   when a context chain exists.

---

## EDGE CASES TO HANDLE

- **Parent content not finished streaming when user branches**: if `contextSummary`
  is null on the parent (still generating), use the parent's partial content
  (first 300 chars of whatever has streamed so far) directly in the system prompt
  as a raw excerpt, prefixed with: `"The parent node is about: [excerpt]"`

- **Very short parent content** (under 60 chars): skip context extraction entirely.
  The content is too short to extract meaningful domain context. Use the standard
  system prompt for the child.

- **Context extraction API call fails**: catch the error silently, log it, and fall
  back to the standard system prompt. Never block branch node creation because
  context extraction failed. The user experience must not degrade — they just get
  a slightly less context-aware answer.

- **User explicitly re-contexts the child** (types a full sentence instead of
  a single word): if the selected text for branching is longer than 8 words,
  treat it as a self-explanatory query and reduce the context injection weight.
  Change the system prompt instruction from "CRITICAL INSTRUCTION" to a softer
  suggestion: `"Note: this query was selected from content about [context]. Answer
  the query as stated, using the context only if relevant."`

- **Context chain depth limit**: never pass more than 3 `ContextEntry` items in
  the chain. If the chain is already 3 deep, drop the oldest entry (index 0)
  before adding the new parent's entry. The most recent 3 ancestors are always
  the most relevant.

---

## WHAT NOT TO DO

- Do NOT send the full parent node content in every child API call. This would
  double or triple the token cost of every branch. The context summary is always
  1-3 sentences maximum.
- Do NOT run context extraction synchronously blocking the branch node creation.
  The node should appear immediately with `isLoading: true` while both the
  context extraction and the answer generation happen in parallel (or sequence,
  since context extraction completes in under 1 second and is needed before
  the answer call).
- Do NOT show the full system prompt to the user. Only the compact context badge
  in the node header (the collapsible "Context from parent" line) is user-visible.
- Do NOT apply context inheritance to root nodes (nodes with no parent). Only
  branch nodes and their descendants get this treatment.
- Do NOT use embeddings or vector search for context matching. That is massive
  overkill for this problem. The heuristic domain detection + LLM fallback
  approach described here is sufficient and has near-zero latency.
