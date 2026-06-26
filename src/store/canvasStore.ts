import { create } from 'zustand';
import { 
  Connection, 
  Edge, 
  EdgeChange, 
  Node, 
  NodeChange, 
  OnConnect, 
  OnEdgesChange, 
  OnNodesChange, 
  XYPosition,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge
} from 'reactflow';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { extractContextSummary } from '@/lib/extractContext';

const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export type NodeType = 'llm' | 'branch' | 'merge' | 'image' | 'doc' | 'question' | 'note';

export interface ContextEntry {
  nodeId: string;
  summary: string;
}

export interface NodeData {
  type: NodeType;
  title: string;
  content: string;
  generation: number;      // 0 = Parent, 1 = Child, 2 = Grandchild, etc.
  isLoading: boolean;
  isCollapsed: boolean;
  parentNodeId?: string;
  conversationHistory: Array<{ 
    role: 'user' | 'assistant'; 
    content: string; 
    senderId?: string | null;
    sender?: {
      username: string;
      avatarColor: string;
    } | null;
  }>;
  imageUrl?: string;
  imagePrompt?: string;
  sourceFile?: string;
  fileSize?: string;
  isBranchSelection?: boolean;
  justUpdated?: boolean;
  createdAt?: string;
  contextSummary?: string | null;
  contextChain?: ContextEntry[];
}

interface DbNode {
  id: string;
  canvas_id: string;
  type: string;
  position_x: number;
  position_y: number;
  width?: number | null;
  height?: number | null;
  title: string;
  content: string;
  is_collapsed: boolean;
  parent_node_id?: string | null;
  image_url?: string | null;
  source_file?: string | null;
  created_at?: string;
  context_summary?: string | null;
  context_chain?: any;
}

interface DbEdge {
  id: string;
  canvas_id: string;
  source_node_id: string;
  target_node_id: string;
}

interface DbMessage {
  id: string;
  node_id: string;
  role: 'user' | 'assistant';
  content: string;
  sender_id?: string | null;
  sender?: {
    id: string;
    username: string;
    avatar_color: string;
  } | null;
}

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
  isLoadingCanvas: boolean;
  activeNodeId: string | null; // For right sidebar Chat box
  theme: 'light' | 'dark';
  newlyCreatedNodeId: string | null;
  showMobileSidebar: boolean;

  // Supabase Integration State
  supabaseClient: SupabaseClient | null;
  realtimeChannel: RealtimeChannel | null;

  // Presence and cursors state
  presenceUsers: Array<{ userId: string; username: string; avatarColor: string }>;
  otherUsersCursors: Record<string, { username: string; avatarColor: string; x: number; y: number }>;
  userRole: 'owner' | 'editor' | null;
  currentUserInfo: { userId: string; username: string; avatarColor: string } | null;
  maxZIndex: number;
  deletedNodesHistory: Array<{ node: Node<NodeData>; edges: Edge[] }>;

  // Actions
  toggleTheme: () => void;
  selectNode: (nodeId: string | null) => Promise<void>;
  addLLMNodeFromSearch: (prompt: string) => Promise<void>;
  addNodeAtPosition: (type: NodeType, x: number, y: number, prompt: string) => Promise<void>;
  deriveNode: (parentNodeId: string, type: NodeType, prompt: string, title?: string) => Promise<void>;
  continueNodeConversation: (nodeId: string, prompt: string) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  undoDeleteNode: () => Promise<void>;
  updateNodeData: (nodeId: string, updates: Partial<NodeData>) => Promise<void>;
  collapseNode: (nodeId: string) => void;
  expandNode: (nodeId: string) => void;
  addMergeNode: (nodeIds: string[], userPrompt?: string) => Promise<void>;
  createNewBoard: (name?: string) => void;
  loadBoard: (boardId: string) => void;
  loadCanvasFromDB: (canvasId: string) => Promise<void>;
  subscribeToCanvas: (
    canvasId: string, 
    getToken: () => Promise<string | null>,
    userInfo?: { userId: string; username: string; avatarColor: string },
    getRawToken?: () => Promise<string | null>
  ) => Promise<void>;
  unsubscribeFromCanvas: () => void;
  queuePositionUpdate: (nodeId: string, x: number, y: number) => void;
  updateNodeSizeLocally: (nodeId: string, width: number, height: number) => void;
  updateNodeSize: (nodeId: string, width: number, height: number) => Promise<void>;
  setNewlyCreatedNodeId: (nodeId: string | null) => void;
  addSelectionBranchNode: (parentNodeId: string, selectedText: string) => void;
  triggerNodeOperation: (nodeId: string, operation: 'explain' | 'expand' | 'shorten') => Promise<void>;
  updateNodeContextSummary: (nodeId: string, summary: string) => Promise<void>;
  selectedModel: 'poolside' | 'gemini' | 'gemini-3.1-flash-lite' | 'gemma-4-31b' | 'gemini-3-flash' | 'gemini-2.5-flash-lite';
  setSelectedModel: (model: 'poolside' | 'gemini' | 'gemini-3.1-flash-lite' | 'gemma-4-31b' | 'gemini-3-flash' | 'gemini-2.5-flash-lite') => void;
  addDocNode: (file: File) => Promise<void>;
  broadcastCursor: (x: number, y: number) => void;
  organizeCanvas: () => Promise<void>;
  clerkTokenFetcher: (() => Promise<string | null>) | null;

  // Dual-mode state
  currentMode: 'canvas' | 'chat';
  setMode: (mode: 'canvas' | 'chat') => void;
  activeParentChatId: string | null;
  setActiveParentChatId: (id: string | null) => void;
  openBranchTabs: Array<{ id: string; parentMessageId: string; textSnippet: string; history: any[] }>;
  activeBranchTabId: string | null;
  setActiveBranchTabId: (id: string | null) => void;
  hoveredBranchTabId: string | null;
  setHoveredBranchTabId: (id: string | null) => void;
  removeBranchTab: (id: string) => void;
  createBranchFromChat: (parentNodeId: string, parentMessageIndex: number, textSnippet: string, operation: 'explain' | 'expand' | 'shorten') => Promise<string>;
}

// Helpers
const getNonOverlappingPosition = (
  preferred: XYPosition,
  existingNodes: Node[],
  width: number = 300,
  height: number = 220
): XYPosition => {
  let candidate = { ...preferred };
  const maxAttempts = 100;
  let attempt = 0;
  
  const bufferX = 40;
  const bufferY = 40;

  const getNum = (val: any): number | undefined => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) return parsed;
    }
    return undefined;
  };

  const isOverlapping = (pos: XYPosition) => {
    for (const node of existingNodes) {
      const w = node.width ?? getNum(node.style?.width) ?? 300;
      const h = node.height ?? getNum(node.style?.height) ?? 220;
      
      const xOverlap = pos.x < node.position.x + w + bufferX && pos.x + width + bufferX > node.position.x;
      const yOverlap = pos.y < node.position.y + h + bufferY && pos.y + height + bufferY > node.position.y;
      
      if (xOverlap && yOverlap) {
        return true;
      }
    }
    return false;
  };

  let gridX = 0;
  let gridY = 0;
  
  while (isOverlapping(candidate) && attempt < maxAttempts) {
    attempt++;
    gridY++;
    if (gridY > 4) {
      gridY = 0;
      gridX++;
    }
    candidate.x = preferred.x + gridX * (width + bufferX);
    candidate.y = preferred.y + gridY * (height + bufferY);
  }
  
  return candidate;
};

const getEdgeColorForGen = (gen: number) => {
  switch (gen) {
    case 1: return '#7c4dff'; // Purple / Parent -> Child
    case 2: return '#00b8d4'; // Teal / Child -> Grandchild
    case 3: return '#ff9100'; // Orange / Grandchild -> Great-Grandchild
    case 4: return '#ff1744'; // Rose / Great-Grandchild -> GGreat-Grandchild
    default: return '#607d8b'; // Slate Gray / Deep gen
  }
};

const buildContextAwareSystemPrompt = (
  contextChain: ContextEntry[],
  selectedText: string
): string => {
  if (!contextChain || contextChain.length === 0) {
    return "You are an expert technical AI partner. Provide high-density technical descriptions containing specific components, specifications, architectures, and concrete examples. Focus purely on technical details. Always format code snippets using triple-backtick code blocks (e.g. ```php ... ```) with the appropriate language identifier, rather than inline single backticks, so that they render in a clean, copyable block. Do NOT output any XML tags, drafting steps, multiple drafts, or self-check lists (like 'Concise? Yes', 'Single sentence? Yes'). Start directly with the technical answer.";
  }

  const contextDescription = contextChain
    .map((entry, i) => {
      if (i === contextChain.length - 1) {
        return `Direct parent context: ${entry.summary}`;
      }
      return `Ancestor context (${contextChain.length - 1 - i} level up): ${entry.summary}`;
    })
    .join("\n");

  const wordCount = selectedText.trim().split(/\s+/).length;

  if (wordCount > 8) {
    return `You are an expert technical AI partner operating inside a specific technical knowledge context.
 
CONTEXT INHERITED FROM PARENT NODES:
${contextDescription}

CRITICAL INSTRUCTIONS:
1. Provide a high-density, technically rich response containing specific spec details, architectural components, and concrete examples. Avoid generic, broad, or bland explanations.
2. Focus purely on technical information.
3. Always format code snippets using triple-backtick code blocks (e.g. \`\`\`php ... \`\`\`) with the appropriate language identifier, rather than inline single backticks, so that they render in a clean, copyable block. Never output multiple lines of code inside inline single backticks.
4. Do NOT output any reasoning steps, drafts, multiple iterations, or self-check lists (e.g. do not output lines like "Concise? Yes", "Single sentence? Yes", "Draft 1: ..."). Go straight to the final answer.`;
  }

  return `You are an expert technical AI partner operating inside a specific technical knowledge context.

CONTEXT INHERITED FROM PARENT NODES:
${contextDescription}

CRITICAL INSTRUCTIONS:
1. Interpret the selected term "${selectedText}" strictly within the technical context provided above (e.g., if the context is about networking and the term is "physical", interpret it as Layer 1 Physical Layer).
2. Provide a high-density, rich explanation containing specific architectural components, protocols, and concrete specifications. Avoid generic, broad, or bland explanations.
3. Always format code snippets using triple-backtick code blocks (e.g. \`\`\`php ... \`\`\`) with the appropriate language identifier, rather than inline single backticks, so that they render in a clean, copyable block. Never output multiple lines of code inside inline single backticks.
4. Do NOT output any reasoning steps, drafts, multiple iterations, or self-check lists (e.g. do not output lines like "Concise? Yes", "Single sentence? Yes", "Draft 1: ..."). Go straight to the final answer.`;
};

const mapDbNodeToReactFlow = (dbNode: DbNode, messages: DbMessage[] = []): Node<NodeData> => {
  const nodeType = dbNode.type as NodeType;
  const sourceFileRaw = dbNode.source_file || undefined;
  let sourceFile = sourceFileRaw;
  let fileSize = undefined;
  if (sourceFileRaw && sourceFileRaw.includes('|')) {
    const parts = sourceFileRaw.split('|');
    sourceFile = parts[0];
    fileSize = parts[1];
  }

  return {
    id: dbNode.id,
    type: 'llmNode',
    position: { x: dbNode.position_x, y: dbNode.position_y },
    width: dbNode.width || undefined,
    height: dbNode.height || undefined,
    style: {
      width: dbNode.width || undefined,
      height: dbNode.height || undefined
    },
    data: {
      type: nodeType,
      title: dbNode.title,
      content: dbNode.content,
      generation: 0, // Will be computed
      isLoading: false,
      isCollapsed: dbNode.is_collapsed,
      parentNodeId: dbNode.parent_node_id || undefined,
      imageUrl: dbNode.image_url || undefined,
      sourceFile,
      fileSize,
      createdAt: dbNode.created_at,
      isBranchSelection: nodeType === 'branch' && dbNode.title === dbNode.content && !messages.some(m => m.role === 'assistant'),
      conversationHistory: messages.map(m => ({
        role: m.role,
        content: m.content,
        senderId: m.sender_id,
        sender: m.sender ? {
          username: m.sender.username,
          avatarColor: m.sender.avatar_color
        } : null
      })),
      contextSummary: dbNode.context_summary || null,
      contextChain: dbNode.context_chain || []
    }
  };
};

const mapDbEdgeToReactFlow = (dbEdge: DbEdge, targetGen: number = 1): Edge => {
  return {
    id: dbEdge.id,
    source: dbEdge.source_node_id,
    target: dbEdge.target_node_id,
    animated: true,
    style: {
      stroke: getEdgeColorForGen(targetGen),
      strokeWidth: 2.5
    }
  };
};

const computeGenerations = (nodes: Node<NodeData>[]): Node<NodeData>[] => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const memo = new Map<string, number>();

  const getGen = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const node = nodeMap.get(id);
    if (!node || !node.data.parentNodeId) {
      memo.set(id, 0);
      return 0;
    }
    const gen = getGen(node.data.parentNodeId) + 1;
    memo.set(id, gen);
    return gen;
  };

  return nodes.map(n => {
    const gen = getGen(n.id);
    return {
      ...n,
      data: {
        ...n.data,
        generation: gen
      }
    };
  });
};

const updateEdgesColor = (edges: Edge[], nodes: Node<NodeData>[]): Edge[] => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return edges.map(e => {
    const targetNode = nodeMap.get(e.target);
    const targetGen = targetNode?.data.generation ?? 1;
    return {
      ...e,
      style: {
        ...e.style,
        stroke: getEdgeColorForGen(targetGen)
      }
    };
  });
};

const organizeNodes = (nodes: Node<NodeData>[], edges: Edge[]): Map<string, { x: number; y: number }> => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const roots: string[] = [];
  const childrenMap = new Map<string, string[]>();
  const hasParent = new Set<string>();

  // Prioritize parentNodeId defined in data
  nodes.forEach(node => {
    const parentId = node.data.parentNodeId;
    if (parentId && nodeMap.has(parentId)) {
      hasParent.add(node.id);
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node.id);
    }
  });

  // Use edges to resolve other parent-child relationships where target has no parent yet
  edges.forEach(edge => {
    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      if (!hasParent.has(edge.target)) {
        hasParent.add(edge.target);
        if (!childrenMap.has(edge.source)) {
          childrenMap.set(edge.source, []);
        }
        childrenMap.get(edge.source)!.push(edge.target);
      }
    }
  });

  // Root nodes are those with no parent
  nodes.forEach(node => {
    if (!hasParent.has(node.id)) {
      roots.push(node.id);
    }
  });

  // Sort roots by original Y position to preserve vertical ordering intent
  roots.sort((a, b) => {
    const nodeA = nodeMap.get(a)!;
    const nodeB = nodeMap.get(b)!;
    return nodeA.position.y - nodeB.position.y;
  });

  // Sort children by original Y position
  for (const [parentId, childIds] of childrenMap.entries()) {
    childIds.sort((a, b) => {
      const nodeA = nodeMap.get(a)!;
      const nodeB = nodeMap.get(b)!;
      return nodeA.position.y - nodeB.position.y;
    });
  }

  const finalPositions = new Map<string, { x: number; y: number }>();

  // Helper to recursively lay out a single subtree
  function layoutSubtree(nodeId: string, x: number): { height: number; positions: Map<string, { x: number; y: number }> } {
    const children = childrenMap.get(nodeId) || [];
    const node = nodeMap.get(nodeId);
    const nodeHeight = node?.height || 160;
    const nodeWidth = node?.width || 300;

    if (children.length === 0) {
      const positions = new Map<string, { x: number; y: number }>();
      positions.set(nodeId, { x, y: 0 });
      return { height: nodeHeight, positions };
    }

    const childLayouts = children.map(childId => {
      const nextX = x + Math.max(nodeWidth + 80, 380);
      return { childId, layout: layoutSubtree(childId, nextX) };
    });

    let totalChildrenHeight = 0;
    for (let i = 0; i < childLayouts.length; i++) {
      totalChildrenHeight += childLayouts[i].layout.height;
      if (i < childLayouts.length - 1) {
        totalChildrenHeight += 60; // vertical spacing between child subtrees
      }
    }

    const subtreeHeight = Math.max(nodeHeight, totalChildrenHeight);
    const positions = new Map<string, { x: number; y: number }>();

    let currentChildY = -totalChildrenHeight / 2;
    const childCenters: number[] = [];

    for (const { childId, layout } of childLayouts) {
      const childSubtreeCenter = currentChildY + layout.height / 2;
      childCenters.push(childSubtreeCenter);

      for (const [id, pos] of layout.positions.entries()) {
        positions.set(id, { x: pos.x, y: pos.y + childSubtreeCenter });
      }

      currentChildY += layout.height + 60;
    }

    let parentY = 0;
    if (childCenters.length > 0) {
      const minCenter = childCenters[0];
      const maxCenter = childCenters[childCenters.length - 1];
      parentY = (minCenter + maxCenter) / 2;
    }

    positions.set(nodeId, { x, y: parentY });
    return { height: subtreeHeight, positions };
  }

  // Layout all roots vertically separated
  let currentY = 100;
  roots.forEach(rootId => {
    const rootLayout = layoutSubtree(rootId, 100);

    let minY = Infinity;
    let maxY = -Infinity;
    for (const [id, pos] of rootLayout.positions.entries()) {
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    }

    const shiftY = currentY - minY;
    for (const [id, pos] of rootLayout.positions.entries()) {
      finalPositions.set(id, { x: pos.x, y: pos.y + shiftY });
    }

    const treeHeight = maxY - minY;
    currentY += Math.max(treeHeight, rootLayout.height) + 150; // gap between separate trees
  });

  return finalPositions;
};

// Module-level map for throttling node updates
const pendingUpdates = new Map<string, {
  x: number;
  y: number;
  timeoutId: NodeJS.Timeout;
  lastSentTime: number;
}>();

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  edges: [],
  boardId: null,
  boardName: 'Untitled Canvas',
  isSaving: false,
  isLoadingCanvas: false,
  activeNodeId: null,
  showMobileSidebar: false,
  theme: 'light',
  supabaseClient: null,
  realtimeChannel: null,
  presenceUsers: [],
  otherUsersCursors: {},
  userRole: null,
  currentUserInfo: null,
  newlyCreatedNodeId: null,
  maxZIndex: 10,
  deletedNodesHistory: [],
  clerkTokenFetcher: null,
  selectedModel: 'poolside',
  setSelectedModel: (model: 'poolside' | 'gemini' | 'gemini-3.1-flash-lite' | 'gemma-4-31b' | 'gemini-3-flash' | 'gemini-2.5-flash-lite') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('spaceS_selectedModel', model);
    }
    set({ selectedModel: model });
  },
  setNewlyCreatedNodeId: (nodeId: string | null) => set({ newlyCreatedNodeId: nodeId }),

  // Dual-mode state initialization
  currentMode: 'canvas',
  setMode: (mode) => set({ currentMode: mode }),
  activeParentChatId: null,
  setActiveParentChatId: (id) => set({ activeParentChatId: id }),
  openBranchTabs: [],
  activeBranchTabId: null,
  setActiveBranchTabId: (id) => set({ activeBranchTabId: id }),
  hoveredBranchTabId: null,
  setHoveredBranchTabId: (id) => set({ hoveredBranchTabId: id }),
  removeBranchTab: (id) => set(state => {
    const nextTabs = state.openBranchTabs.filter(t => t.id !== id);
    let nextActive = state.activeBranchTabId;
    if (state.activeBranchTabId === id) {
      nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].id : null;
    }
    return {
      openBranchTabs: nextTabs,
      activeBranchTabId: nextActive
    };
  }),

  createBranchFromChat: async (parentNodeId: string, parentMessageIndex: number, textSnippet: string, operation: 'explain' | 'expand' | 'shorten') => {
    const parentNode = get().nodes.find(n => n.id === parentNodeId);
    if (!parentNode) return '';

    const parentGen = parentNode.data.generation ?? 0;
    const childGen = parentGen + 1;

    const preferredPosition: XYPosition = {
      x: parentNode.position.x + 360,
      y: parentNode.position.y + (Math.random() - 0.5) * 120
    };
    const position = getNonOverlappingPosition(preferredPosition, get().nodes);

    // Build context chain
    const parentContextChain = parentNode.data.contextChain ?? [];
    const parentContextSummary = parentNode.data.contextSummary;

    let childContextChain: ContextEntry[] = [];
    if (parentContextSummary) {
      childContextChain = [...parentContextChain, { nodeId: parentNodeId, summary: parentContextSummary }].slice(-3);
    } else {
      const parentRawContent = parentNode.data.content || '';
      const cleaned = parentRawContent.slice(0, 300).replace(/[*#_`\[\]()]/g, '').trim();
      childContextChain = [...parentContextChain, { nodeId: parentNodeId, summary: `Context from parent: "${cleaned}"` }].slice(-3);
    }

    const inheritedHistory = parentNode.data.conversationHistory.slice(0, parentMessageIndex + 1);

    // Build operation prompt & title
    let opPrompt = '';
    let opTitle = '';
    switch (operation) {
      case 'explain':
        opPrompt = `Explain the concept of "${textSnippet}" clearly and thoroughly. Focus on core architectural details, mechanical components, and concrete examples.`;
        opTitle = `Explanation: ${textSnippet}`;
        break;
      case 'expand':
        opPrompt = `Provide an exhaustive technical breakdown of "${textSnippet}". Detail the underlying mechanics, architectural/protocol specs, and specific implementation details.`;
        opTitle = `Expansion: ${textSnippet}`;
        break;
      case 'shorten':
        opPrompt = `Summarize "${textSnippet}" concisely in a single sentence, packing in high-density technical signal details (e.g. key mechanics, technologies, or specifications) so that the summary is rich and precise.`;
        opTitle = `Summary: ${textSnippet}`;
        break;
    }

    const branchUserMsg = {
      role: 'user' as const,
      content: opPrompt,
      senderId: get().currentUserInfo?.userId,
      sender: get().currentUserInfo ? {
        username: get().currentUserInfo!.username,
        avatarColor: get().currentUserInfo!.avatarColor
      } : null
    };

    const initialHistory = [...inheritedHistory, branchUserMsg];

    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    const childId = generateUUID();
    const nextZIndex = get().maxZIndex + 1;

    const childNode: Node<NodeData> = {
      id: childId,
      type: 'llmNode',
      position,
      zIndex: nextZIndex,
      data: {
        type: 'branch',
        title: opTitle,
        content: '',
        generation: childGen,
        isLoading: true,
        isCollapsed: false,
        parentNodeId,
        createdAt: new Date().toISOString(),
        conversationHistory: initialHistory,
        isBranchSelection: false,
        contextSummary: null,
        contextChain: childContextChain
      }
    };

    set(state => {
      const nextNodes = computeGenerations([...state.nodes, childNode]);
      const newEdge = {
        id: `edge_${parentNodeId}_to_${childId}`,
        source: parentNodeId,
        target: childId,
        animated: true,
        style: {
          stroke: getEdgeColorForGen(childGen),
          strokeWidth: 2.5
        }
      };
      const nextEdges = updateEdgesColor([...state.edges, newEdge], nextNodes);

      const newTab = {
        id: childId,
        parentMessageId: `${parentNodeId}_${parentMessageIndex}`,
        textSnippet,
        history: inheritedHistory
      };

      return {
        nodes: nextNodes,
        edges: nextEdges,
        maxZIndex: nextZIndex,
        openBranchTabs: [...state.openBranchTabs.filter(t => t.id !== childId), newTab],
        activeBranchTabId: childId
      };
    });

    if (boardId && boardId !== 'sample-board' && supabase) {
      try {
        const { data: dbNode } = await supabase
          .from('nodes')
          .insert({
            id: childId,
            canvas_id: boardId,
            type: 'branch',
            position_x: position.x,
            position_y: position.y,
            title: opTitle.slice(0, 100),
            content: '',
            parent_node_id: parentNodeId,
            context_chain: childContextChain,
            context_summary: null
          })
          .select()
          .single();

        if (dbNode) {
          await supabase.from('edges').insert({
            canvas_id: boardId,
            source_node_id: parentNodeId,
            target_node_id: childId
          });

          // Insert inherited messages + operation user query into DB
          for (const msg of initialHistory) {
            await supabase.from('node_messages').insert({
              node_id: childId,
              role: msg.role,
              content: msg.content,
              sender_id: msg.senderId
            });
          }
        }
      } catch (err) {
        console.error('Error inserting branch to Supabase:', err);
      }
    }

    // Start streaming the AI's explanation/expansion/brief response
    const fetcher = get().clerkTokenFetcher;
    const token = fetcher ? await fetcher() : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const systemPrompt = buildContextAwareSystemPrompt(childContextChain, textSnippet);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: initialHistory,
          systemPrompt,
          model: get().selectedModel
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `API failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });

          set(state => ({
            nodes: state.nodes.map(n => {
              if (n.id === childId) {
                return {
                  ...n,
                  data: { 
                    ...n.data, 
                    content,
                    conversationHistory: [
                      ...initialHistory,
                      { role: 'assistant', content }
                    ]
                  }
                };
              }
              return n;
            })
          }));
        }
      }

      if (boardId && boardId !== 'sample-board' && supabase) {
        await supabase.from('node_messages').insert({
          node_id: childId,
          role: 'assistant',
          content
        });
        await supabase.from('nodes').update({ content }).eq('id', childId);
      }

      // Extract context summary
      let extractedSummary: string | null = null;
      try {
        if (content.trim().length >= 60) {
          extractedSummary = await extractContextSummary(content, opTitle, token, get().selectedModel);
        }
      } catch (e) {
        console.error('Failed to extract context summary for branch:', e);
      }

      if (extractedSummary && boardId && boardId !== 'sample-board' && supabase) {
        await supabase.from('nodes').update({ context_summary: extractedSummary }).eq('id', childId);
      }

      set(state => ({
        nodes: state.nodes.map(n => {
          if (n.id === childId) {
            return {
              ...n,
              data: {
                ...n.data,
                isLoading: false,
                contextSummary: extractedSummary || n.data.contextSummary,
                content,
                conversationHistory: [
                  ...initialHistory,
                  { role: 'assistant', content }
                ]
              }
            };
          }
          return n;
        })
      }));

    } catch (err) {
      console.error('Error generating branch content:', err);
      set(state => ({
        nodes: state.nodes.map(n => {
          if (n.id === childId) {
            return {
              ...n,
              data: {
                ...n.data,
                isLoading: false,
                content: 'Failed to generate response.'
              }
            };
          }
          return n;
        })
      }));
    }

    return childId;
  },

  updateNodeContextSummary: async (nodeId: string, summary: string) => {
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, contextSummary: summary } }
          : n
      )
    }));

    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    if (boardId && boardId !== 'sample-board' && supabase) {
      await supabase
        .from('nodes')
        .update({ context_summary: summary })
        .eq('id', nodeId);
    }
  },

  toggleTheme: () => {
    set(state => ({
      theme: state.theme === 'light' ? 'dark' : 'light'
    }));
  },

  // React Flow handlers
  onNodesChange: (changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, get().nodes);
    set({ nodes: updatedNodes });

    const positionChanges = changes.filter(c => c.type === 'position');
    if (positionChanges.length > 0 && get().boardId && get().boardId !== 'sample-board') {
      positionChanges.forEach(change => {
        if (change.type === 'position' && change.position) {
          get().queuePositionUpdate(change.id, change.position.x, change.position.y);
        }
      });
    }
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set(state => ({
      edges: applyEdgeChanges(changes, state.edges)
    }));

    const deletedChanges = changes.filter(c => c.type === 'remove');
    const supabase = get().supabaseClient;
    const boardId = get().boardId;
    if (deletedChanges.length > 0 && supabase && boardId && boardId !== 'sample-board') {
      deletedChanges.forEach(async change => {
        await supabase.from('edges').delete().eq('id', change.id);
      });
    }
  },

  onConnect: async (connection: Connection) => {
    const sourceNode = get().nodes.find(n => n.id === connection.source);
    const targetNode = get().nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return;

    const targetGen = targetNode.data.generation ?? 0;
    const boardId = get().boardId;
    const supabase = get().supabaseClient;

    // Optimistically add the connection to local state
    const tempEdgeId = `temp_edge_${connection.source}_to_${connection.target}`;
    const newEdge: Edge = {
      ...connection,
      id: tempEdgeId,
      animated: true,
      style: {
        stroke: getEdgeColorForGen(targetGen || 1),
        strokeWidth: 2.5,
      }
    } as Edge;

    set(state => ({
      edges: addEdge(newEdge, state.edges)
    }));

    if (boardId && boardId !== 'sample-board' && supabase) {
      const { data: dbEdge, error } = await supabase
        .from('edges')
        .insert({
          canvas_id: boardId,
          source_node_id: connection.source,
          target_node_id: connection.target
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating edge in DB:', error);
        // Rollback optimistic addition on error
        set(state => ({
          edges: state.edges.filter(e => e.id !== tempEdgeId)
        }));
      } else if (dbEdge) {
        // Swap the temporary ID with the database UUID
        set(state => {
          const exists = state.edges.some(e => e.id === dbEdge.id);
          if (exists) {
            return {
              edges: state.edges.filter(e => e.id !== tempEdgeId)
            };
          }
          return {
            edges: state.edges.map(e => e.id === tempEdgeId ? { ...e, id: dbEdge.id } : e)
          };
        });
      }
    }
  },

  selectNode: async (nodeId: string | null) => {
    set({ activeNodeId: nodeId, showMobileSidebar: !!nodeId });

    if (nodeId) {
      const nextZIndex = get().maxZIndex + 1;
      set(state => ({
        maxZIndex: nextZIndex,
        nodes: state.nodes.map(n => n.id === nodeId ? { ...n, zIndex: nextZIndex } : n)
      }));
    }

    if (nodeId && get().boardId !== 'sample-board' && get().supabaseClient) {
      const supabase = get().supabaseClient;
      if (!supabase) return;

      const { data: msgs } = await supabase
        .from('node_messages')
        .select('*, sender:users(id, username, avatar_color)')
        .eq('node_id', nodeId)
        .order('created_at', { ascending: true });

      if (msgs) {
        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === nodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  isBranchSelection: n.data.type === 'branch'
                    ? (n.data.title === n.data.content && !msgs.some(m => m.role === 'assistant'))
                    : false,
                  conversationHistory: msgs.map(m => ({
                    role: m.role,
                    content: m.content,
                    senderId: m.sender_id,
                    sender: m.sender ? {
                      username: m.sender.username,
                      avatarColor: m.sender.avatar_color
                    } : null
                  }))
                }
              };
            }
            return n;
          })
        }));
      }
    }
  },

  // Action: Add new independent parent node from main search box
  addLLMNodeFromSearch: async (prompt: string) => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const preferredPosition: XYPosition = {
      x: viewportWidth / 2 - 150,
      y: viewportHeight / 2 - 100,
    };
    const position = getNonOverlappingPosition(preferredPosition, get().nodes);

    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    let nodeId = `node_${Date.now()}`;

    if (boardId && boardId !== 'sample-board' && supabase) {
      const { data: dbNode, error: nodeError } = await supabase
        .from('nodes')
        .insert({
          canvas_id: boardId,
          type: 'llm',
          position_x: position.x,
          position_y: position.y,
          title: prompt,
          content: ''
        })
        .select()
        .single();

      if (nodeError || !dbNode) {
        console.error('Failed to insert node in DB:', nodeError);
        return;
      }

      nodeId = dbNode.id;

      // Auto-name the canvas if it's the first node on this canvas
      const isFirstNode = get().nodes.length === 0;
      const initialTitle = prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt;

      if (isFirstNode) {
        await supabase
          .from('canvases')
          .update({ name: initialTitle, updated_at: new Date().toISOString() })
          .eq('id', boardId);
        set({ boardName: initialTitle });
      }

      await supabase.from('node_messages').insert({
        node_id: nodeId,
        role: 'user',
        content: prompt,
        sender_id: get().currentUserInfo?.userId
      });

      const nextZIndex = get().maxZIndex + 1;
      const parentNode: Node<NodeData> = {
        id: nodeId,
        type: 'llmNode',
        position,
        zIndex: nextZIndex,
        data: {
          type: 'llm',
          title: prompt,
          content: '',
          generation: 0,
          isLoading: true,
          isCollapsed: false,
          createdAt: dbNode.created_at || new Date().toISOString(),
          conversationHistory: [{
            role: 'user',
            content: prompt,
            senderId: get().currentUserInfo?.userId,
            sender: get().currentUserInfo ? {
              username: get().currentUserInfo!.username,
              avatarColor: get().currentUserInfo!.avatarColor
            } : null
          }]
        }
      };

      set(state => {
        const exists = state.nodes.some(n => n.id === nodeId);
        if (exists) {
          return {
            nodes: state.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isLoading: true, conversationHistory: parentNode.data.conversationHistory } } : n),
            activeNodeId: nodeId,
            newlyCreatedNodeId: nodeId,
            showMobileSidebar: false,
          };
        }
        return {
          nodes: computeGenerations([...state.nodes, parentNode]),
          activeNodeId: nodeId,
          newlyCreatedNodeId: nodeId,
          showMobileSidebar: false,
          maxZIndex: nextZIndex
        };
      });

      const fetcher = get().clerkTokenFetcher;
      const token = fetcher ? await fetcher() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: get().selectedModel
          })
        });

        if (!response.ok) throw new Error('API failed');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let content = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            content += decoder.decode(value, { stream: true });
            
            set(state => ({
              nodes: state.nodes.map(n => {
                if (n.id === nodeId) {
                  return {
                    ...n,
                    data: { ...n.data, content }
                  };
                }
                return n;
              })
            }));
          }
        }

        // Extract context summary for the root search node
        let extractedSummary: string | null = null;
        try {
          if (content.trim().length >= 60) {
            extractedSummary = await extractContextSummary(content, prompt, token, get().selectedModel);
          }
        } catch (e) {
          console.error('Failed to extract context summary for search node:', e);
        }

        await supabase.from('node_messages').insert({
          node_id: nodeId,
          role: 'assistant',
          content
        });

        const updateData: any = { content };
        if (extractedSummary) {
          updateData.context_summary = extractedSummary;
        }

        await supabase.from('nodes').update(updateData).eq('id', nodeId);

        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === nodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  isLoading: false,
                  contextSummary: extractedSummary || n.data.contextSummary,
                  conversationHistory: [
                    ...n.data.conversationHistory,
                    { role: 'assistant', content }
                  ]
                }
              };
            }
            return n;
          })
        }));

      } catch (err) {
        console.error('Error fetching parent node response:', err);
        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === nodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  content: 'Failed to generate response. Check API logs.',
                  isLoading: false
                }
              };
            }
            return n;
          })
        }));
      }

    } else {
      const nextZIndex = get().maxZIndex + 1;
      const parentNode: Node<NodeData> = {
        id: nodeId,
        type: 'llmNode',
        position,
        zIndex: nextZIndex,
        data: {
          type: 'llm',
          title: prompt,
          content: '',
          generation: 0,
          isLoading: true,
          isCollapsed: false,
          createdAt: new Date().toISOString(),
          conversationHistory: [{ role: 'user', content: prompt }]
        }
      };

      set(state => ({
        nodes: [...state.nodes, parentNode],
        activeNodeId: nodeId,
        newlyCreatedNodeId: nodeId,
        showMobileSidebar: false,
        maxZIndex: nextZIndex
      }));

      const fetcher = get().clerkTokenFetcher;
      const token = fetcher ? await fetcher() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: get().selectedModel
          })
        });

        if (!response.ok) throw new Error('API failed');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let content = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            content += decoder.decode(value, { stream: true });
            
            set(state => ({
              nodes: state.nodes.map(n => {
                if (n.id === nodeId) {
                  return {
                    ...n,
                    data: { ...n.data, content }
                  };
                }
                return n;
              })
            }));
          }
        }

        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === nodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  isLoading: false,
                  conversationHistory: [
                    ...n.data.conversationHistory,
                    { role: 'assistant', content }
                  ]
                }
              };
            }
            return n;
          })
        }));

      } catch (err) {
        console.error('Error fetching parent node response:', err);
        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === nodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  content: 'Failed to generate response.',
                  isLoading: false
                }
              };
            }
            return n;
          })
        }));
      }
    }
  },

  addNodeAtPosition: async (type: NodeType, x: number, y: number, prompt: string) => {
    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    let nodeId = `node_${Date.now()}`;
    const nextZIndex = get().maxZIndex + 1;

    const position = { x, y };
    const isAI = type !== 'note' && prompt.trim().length > 0;

    if (boardId && boardId !== 'sample-board' && supabase) {
      const dbType = ['llm', 'branch', 'merge', 'image', 'doc', 'question', 'note'].includes(type) ? type : 'llm';
      const { data: dbNode, error: nodeError } = await supabase
        .from('nodes')
        .insert({
          canvas_id: boardId,
          type: dbType,
          position_x: position.x,
          position_y: position.y,
          title: prompt || (type === 'note' ? 'New Note' : 'New Node'),
          content: type === 'note' ? prompt : ''
        })
        .select()
        .single();

      if (nodeError || !dbNode) {
        console.error('Failed to insert node in DB:', nodeError);
        return;
      }
      nodeId = dbNode.id;

      if (isAI) {
        await supabase.from('node_messages').insert({
          node_id: nodeId,
          role: 'user',
          content: prompt,
          sender_id: get().currentUserInfo?.userId
        });
      }

      const newNode: Node<NodeData> = {
        id: nodeId,
        type: 'llmNode',
        position,
        zIndex: nextZIndex,
        data: {
          type: dbType,
          title: prompt || (type === 'note' ? 'New Note' : 'New Node'),
          content: type === 'note' ? prompt : '',
          generation: 0,
          isLoading: isAI,
          isCollapsed: false,
          conversationHistory: isAI ? [{
            role: 'user',
            content: prompt,
            senderId: get().currentUserInfo?.userId,
            sender: get().currentUserInfo ? {
              username: get().currentUserInfo!.username,
              avatarColor: get().currentUserInfo!.avatarColor
            } : null
          }] : [],
          createdAt: dbNode.created_at || new Date().toISOString()
        }
      };

      set(state => ({
        nodes: [...state.nodes, newNode],
        activeNodeId: nodeId,
        newlyCreatedNodeId: nodeId,
        showMobileSidebar: false,
        maxZIndex: nextZIndex
      }));

      if (isAI) {
        const fetcher = get().clerkTokenFetcher;
        const token = fetcher ? await fetcher() : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              messages: [{ role: 'user', content: prompt }],
              model: get().selectedModel
            })
          });

          if (!response.ok) throw new Error('API failed');

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let content = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              content += decoder.decode(value, { stream: true });

              set(state => ({
                nodes: state.nodes.map(n => {
                  if (n.id === nodeId) {
                    return {
                      ...n,
                      data: { ...n.data, content }
                    };
                  }
                  return n;
                })
              }));
            }
          }

          await supabase.from('node_messages').insert({
            node_id: nodeId,
            role: 'assistant',
            content
          });

          await supabase.from('nodes').update({ content }).eq('id', nodeId);

          set(state => ({
            nodes: state.nodes.map(n => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    isLoading: false,
                    conversationHistory: [
                      ...n.data.conversationHistory,
                      { role: 'assistant', content }
                    ]
                  }
                };
              }
              return n;
            })
          }));
        } catch (err) {
          console.error('Error fetching AI stream for new node:', err);
          set(state => ({
            nodes: state.nodes.map(n => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    isLoading: false,
                    content: 'Failed to generate AI response.'
                  }
                };
              }
              return n;
            })
          }));
        }
      }
    } else {
      const newNode: Node<NodeData> = {
        id: nodeId,
        type: 'llmNode',
        position,
        zIndex: nextZIndex,
        data: {
          type,
          title: prompt || (type === 'note' ? 'New Note' : 'New Node'),
          content: type === 'note' ? prompt : '',
          generation: 0,
          isLoading: isAI,
          isCollapsed: false,
          conversationHistory: isAI ? [{
            role: 'user',
            content: prompt,
            senderId: get().currentUserInfo?.userId,
            sender: get().currentUserInfo ? {
              username: get().currentUserInfo!.username,
              avatarColor: get().currentUserInfo!.avatarColor
            } : null
          }] : [],
          createdAt: new Date().toISOString()
        }
      };

      set(state => ({
        nodes: [...state.nodes, newNode],
        activeNodeId: nodeId,
        newlyCreatedNodeId: nodeId,
        showMobileSidebar: false,
        maxZIndex: nextZIndex
      }));

      if (isAI) {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: prompt }],
              model: get().selectedModel
            })
          });

          if (!response.ok) throw new Error('API failed');

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let content = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              content += decoder.decode(value, { stream: true });

              set(state => ({
                nodes: state.nodes.map(n => {
                  if (n.id === nodeId) {
                    return {
                      ...n,
                      data: { ...n.data, content }
                    };
                  }
                  return n;
                })
              }));
            }
          }

          set(state => ({
            nodes: state.nodes.map(n => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    isLoading: false,
                    conversationHistory: [
                      ...n.data.conversationHistory,
                      { role: 'assistant', content }
                    ]
                  }
                };
              }
              return n;
            })
          }));
        } catch (err) {
          console.error('Error fetching local AI stream:', err);
          set(state => ({
            nodes: state.nodes.map(n => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    isLoading: false,
                    content: 'Failed to generate AI response.'
                  }
                };
              }
              return n;
            })
          }));
        }
      }
    }
  },

  // Action: Derive child / grandchild from an existing node
  deriveNode: async (parentNodeId: string, type: NodeType, prompt: string, title?: string) => {
    const parentNode = get().nodes.find(n => n.id === parentNodeId);
    if (!parentNode) return;

    const parentGen = parentNode.data.generation ?? 0;
    const childGen = parentGen + 1;

    const preferredPosition: XYPosition = {
      x: parentNode.position.x + 360,
      y: parentNode.position.y + (Math.random() - 0.5) * 160
    };
    const position = getNonOverlappingPosition(preferredPosition, get().nodes);

    // Build context chain
    const parentContextChain = parentNode.data.contextChain ?? [];
    const parentContextSummary = parentNode.data.contextSummary;

    let childContextChain: ContextEntry[] = [];
    if (parentContextSummary) {
      const newEntry: ContextEntry = {
        nodeId: parentNodeId,
        summary: parentContextSummary
      };
      childContextChain = [...parentContextChain, newEntry].slice(-3);
    } else {
      // Fallback: parent context not extracted yet
      const parentRawContent = parentNode.data.content || '';
      if (parentRawContent.length > 0) {
        const cleaned = parentRawContent
          .slice(0, 300)
          .replace(/[*#_`\[\]()]/g, '')
          .trim();
        const newEntry: ContextEntry = {
          nodeId: parentNodeId,
          summary: `Context from parent node: "${cleaned}"`
        };
        childContextChain = [...parentContextChain, newEntry].slice(-3);
      } else {
        childContextChain = parentContextChain;
      }
    }

    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    let childId = `node_${Date.now()}`;

    if (boardId && boardId !== 'sample-board' && supabase) {
      const dbType = ['llm', 'branch', 'merge', 'image', 'doc', 'question', 'note'].includes(type) ? type : 'llm';

      const { data: dbNode, error: nodeError } = await supabase
        .from('nodes')
        .insert({
          canvas_id: boardId,
          type: dbType,
          position_x: position.x,
          position_y: position.y,
          title: title || prompt,
          content: type === 'note' ? prompt : '',
          parent_node_id: parentNodeId,
          context_chain: childContextChain
        })
        .select()
        .single();

      if (nodeError || !dbNode) {
        console.error('Failed to insert child node in DB:', nodeError);
        return;
      }

      childId = dbNode.id;

      const { data: dbEdge } = await supabase
        .from('edges')
        .insert({
          canvas_id: boardId,
          source_node_id: parentNodeId,
          target_node_id: childId
        })
        .select()
        .single();

      if (type !== 'note') {
        await supabase.from('node_messages').insert({
          node_id: childId,
          role: 'user',
          content: prompt,
          sender_id: get().currentUserInfo?.userId
        });
      }

      const nextZIndex = get().maxZIndex + 1;
      const childNode: Node<NodeData> = {
        id: childId,
        type: 'llmNode',
        position,
        zIndex: nextZIndex,
        data: {
          type,
          title: title || prompt,
          content: type === 'note' ? prompt : '',
          generation: childGen,
          isLoading: type !== 'note',
          isCollapsed: false,
          parentNodeId,
          createdAt: dbNode.created_at || new Date().toISOString(),
          contextChain: childContextChain,
          contextSummary: null,
          conversationHistory: type === 'note' ? [] : [{
            role: 'user',
            content: prompt,
            senderId: get().currentUserInfo?.userId,
            sender: get().currentUserInfo ? {
              username: get().currentUserInfo!.username,
              avatarColor: get().currentUserInfo!.avatarColor
            } : null
          }]
        }
      };

      set(state => {
        const existsNode = state.nodes.some(n => n.id === childId);
        const updatedNodes = existsNode 
          ? state.nodes.map(n => n.id === childId ? { ...n, data: { ...n.data, isLoading: type !== 'note', conversationHistory: childNode.data.conversationHistory, contextChain: childContextChain, contextSummary: null } } : n)
          : computeGenerations([...state.nodes, childNode]);

        const edgeId = dbEdge ? dbEdge.id : `edge_${parentNodeId}_to_${childId}`;
        const existsEdge = state.edges.some(e => e.id === edgeId);
        
        let updatedEdges = state.edges;
        if (!existsEdge) {
          const newLocalEdge = {
            id: edgeId,
            source: parentNodeId,
            target: childId,
            animated: true,
            style: {
              stroke: getEdgeColorForGen(childGen),
              strokeWidth: 2.5
            }
          };
          updatedEdges = updateEdgesColor([...state.edges, newLocalEdge], updatedNodes);
        } else {
          updatedEdges = updateEdgesColor(state.edges, updatedNodes);
        }

        return {
          nodes: updatedNodes,
          edges: updatedEdges,
          activeNodeId: childId,
          newlyCreatedNodeId: childId,
          showMobileSidebar: false,
          maxZIndex: nextZIndex
        };
      });

      if (type === 'note') return;

      const fetcher = get().clerkTokenFetcher;
      const token = fetcher ? await fetcher() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const systemPrompt = buildContextAwareSystemPrompt(childContextChain, '');
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            systemPrompt,
            model: get().selectedModel
          })
        });

        if (!response.ok) throw new Error('API failed');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let content = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            content += decoder.decode(value, { stream: true });

            set(state => ({
              nodes: state.nodes.map(n => {
                if (n.id === childId) {
                  return {
                    ...n,
                    data: { ...n.data, content }
                  };
                }
                return n;
              })
            }));
          }
        }

        await supabase.from('node_messages').insert({
          node_id: childId,
          role: 'assistant',
          content
        });

        // Extract context summary for the newly generated derived node
        let extractedSummary: string | null = null;
        try {
          if (content.trim().length >= 60) {
            extractedSummary = await extractContextSummary(content, prompt, token, get().selectedModel);
          }
        } catch (e) {
          console.error('Failed to extract context summary for derived node:', e);
        }

        const nodeUpdateData: any = { content };
        if (extractedSummary) {
          nodeUpdateData.context_summary = extractedSummary;
        }

        await supabase.from('nodes').update(nodeUpdateData).eq('id', childId);

        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === childId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  isLoading: false,
                  contextSummary: extractedSummary || n.data.contextSummary,
                  conversationHistory: [
                    ...n.data.conversationHistory,
                    { role: 'assistant', content }
                  ]
                }
              };
            }
            return n;
          })
        }));

      } catch (err) {
        console.error('Error generating child node content:', err);
        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === childId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  content: 'Failed to generate response.',
                  isLoading: false
                }
              };
            }
            return n;
          })
        }));
      }

    } else {
      const nextZIndex = get().maxZIndex + 1;
      const childNode: Node<NodeData> = {
        id: childId,
        type: 'llmNode',
        position,
        zIndex: nextZIndex,
        data: {
          type,
          title: title || prompt,
          content: type === 'note' ? prompt : '',
          generation: childGen,
          isLoading: type !== 'note',
          isCollapsed: false,
          parentNodeId,
          createdAt: new Date().toISOString(),
          contextChain: childContextChain,
          contextSummary: null,
          conversationHistory: type === 'note' ? [] : [{ role: 'user', content: prompt }]
        }
      };

      const newEdge: Edge = {
        id: `edge_${parentNodeId}_to_${childId}`,
        source: parentNodeId,
        target: childId,
        animated: true,
        style: {
          stroke: getEdgeColorForGen(childGen),
          strokeWidth: 2.5
        }
      };

      set(state => ({
        nodes: [...state.nodes, childNode],
        edges: [...state.edges, newEdge],
        activeNodeId: childId,
        newlyCreatedNodeId: childId,
        showMobileSidebar: false,
        maxZIndex: nextZIndex
      }));

      if (type === 'note') return;

      const fetcher = get().clerkTokenFetcher;
      const token = fetcher ? await fetcher() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const systemPrompt = buildContextAwareSystemPrompt(childContextChain, '');
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            systemPrompt,
            model: get().selectedModel
          })
        });

        if (!response.ok) throw new Error('API failed');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let content = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            content += decoder.decode(value, { stream: true });

            set(state => ({
              nodes: state.nodes.map(n => {
                if (n.id === childId) {
                  return {
                    ...n,
                    data: { ...n.data, content }
                  };
                }
                return n;
              })
            }));
          }
        }

        // Extract context summary for the newly generated local derived node
        let extractedSummary: string | null = null;
        try {
          if (content.trim().length >= 60) {
            extractedSummary = await extractContextSummary(content, prompt, token, get().selectedModel);
          }
        } catch (e) {
          console.error('Failed to extract context summary for local derived node:', e);
        }

        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === childId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  isLoading: false,
                  contextSummary: extractedSummary || n.data.contextSummary,
                  conversationHistory: [
                    ...n.data.conversationHistory,
                    { role: 'assistant', content }
                  ]
                }
              };
            }
            return n;
          })
        }));

      } catch (err) {
        console.error('Error generating child node content:', err);
        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === childId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  content: 'Failed to generate response.',
                  isLoading: false
                }
              };
            }
            return n;
          })
        }));
      }
    }
  },

  // Action: Chatbox conversation belonging to this node only
  continueNodeConversation: async (nodeId: string, prompt: string) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node || node.data.isLoading) return;

    const previousContent = node.data.content || '';
    const questionHeader = `\n\n---\n**Q:** ${prompt}\n\n**A:** `;

    const updatedHistory = [
      ...node.data.conversationHistory,
      {
        role: 'user' as const,
        content: prompt,
        senderId: get().currentUserInfo?.userId,
        sender: get().currentUserInfo ? {
          username: get().currentUserInfo!.username,
          avatarColor: get().currentUserInfo!.avatarColor
        } : null
      }
    ];

    set(state => ({
      nodes: state.nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              isLoading: true,
              conversationHistory: updatedHistory
            }
          };
        }
        return n;
      })
    }));

    const boardId = get().boardId;
    const supabase = get().supabaseClient;

    if (boardId && boardId !== 'sample-board' && supabase) {
      await supabase.from('node_messages').insert({
        node_id: nodeId,
        role: 'user',
        content: prompt,
        sender_id: get().currentUserInfo?.userId
      });
    }

    const fetcher = get().clerkTokenFetcher;
    const token = fetcher ? await fetcher() : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const systemPrompt = buildContextAwareSystemPrompt(node.data.contextChain || [], '');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: updatedHistory,
          systemPrompt,
          model: get().selectedModel
        })
      });

      if (!response.ok) throw new Error('API failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });

          set(state => ({
            nodes: state.nodes.map(n => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    content: previousContent + questionHeader + content
                  }
                };
              }
              return n;
            })
          }));
        }
      }

      // Extract updated context summary
      let extractedSummary: string | null = null;
      try {
        const fullContent = previousContent + questionHeader + content;
        if (fullContent.trim().length >= 60) {
          extractedSummary = await extractContextSummary(fullContent, node.data.title, token, get().selectedModel);
        }
      } catch (e) {
        console.error('Failed to extract context summary for continue conversation:', e);
      }

      if (boardId && boardId !== 'sample-board' && supabase) {
        await supabase.from('node_messages').insert({
          node_id: nodeId,
          role: 'assistant',
          content
        });

        const updateData: any = { content: previousContent + questionHeader + content };
        if (extractedSummary) {
          updateData.context_summary = extractedSummary;
        }

        await supabase.from('nodes').update(updateData).eq('id', nodeId);
      }

      set(state => ({
        nodes: state.nodes.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                isLoading: false,
                content: previousContent + questionHeader + content,
                contextSummary: extractedSummary || n.data.contextSummary,
                conversationHistory: [
                  ...updatedHistory,
                  { role: 'assistant', content }
                ]
              }
            };
          }
          return n;
        })
      }));

    } catch (err) {
      console.error('Error continuing conversation:', err);
      set(state => ({
        nodes: state.nodes.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                isLoading: false
              }
            };
          }
          return n;
        })
      }));
    }
  },

  addDocNode: async (file: File) => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const preferredPosition: XYPosition = {
      x: viewportWidth / 2 - 150,
      y: viewportHeight / 2 - 100,
    };
    const position = getNonOverlappingPosition(preferredPosition, get().nodes);

    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    let nodeId = `node_${Date.now()}`;

    const formatBytes = (bytes: number, decimals = 1) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const fileSizeStr = formatBytes(file.size);

    if (boardId && boardId !== 'sample-board' && supabase) {
      const { data: dbNode, error: nodeError } = await supabase
        .from('nodes')
        .insert({
          canvas_id: boardId,
          type: 'doc',
          position_x: position.x,
          position_y: position.y,
          title: file.name,
          content: 'Transcribing...',
          source_file: `${file.name}|${fileSizeStr}`
        })
        .select()
        .single();

      if (nodeError || !dbNode) {
        console.error('Failed to insert doc node in DB:', nodeError);
        return;
      }

      nodeId = dbNode.id;

      // Auto-name the canvas if it's the first node on this canvas
      const isFirstNode = get().nodes.length === 0;
      if (isFirstNode) {
        await supabase
          .from('canvases')
          .update({ name: file.name, updated_at: new Date().toISOString() })
          .eq('id', boardId);
        set({ boardName: file.name });
      }
    }

    const nextZIndex = get().maxZIndex + 1;
    const docNode: Node<NodeData> = {
      id: nodeId,
      type: 'llmNode',
      position,
      zIndex: nextZIndex,
      data: {
        type: 'doc',
        title: file.name,
        content: 'Transcribing...',
        generation: 0,
        isLoading: true,
        isCollapsed: false,
        sourceFile: file.name,
        fileSize: fileSizeStr,
        createdAt: new Date().toISOString(),
        conversationHistory: []
      }
    };

    set(state => {
      const exists = state.nodes.some(n => n.id === nodeId);
      if (exists) {
        return {
          nodes: state.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isLoading: true, sourceFile: docNode.data.sourceFile, fileSize: docNode.data.fileSize } } : n),
          activeNodeId: nodeId,
          newlyCreatedNodeId: nodeId,
          showMobileSidebar: false,
        };
      }
      return {
        nodes: computeGenerations([...state.nodes, docNode]),
        activeNodeId: nodeId,
        newlyCreatedNodeId: nodeId,
        showMobileSidebar: false,
        maxZIndex: nextZIndex
      };
    });

    const fetcher = get().clerkTokenFetcher;
    const token = fetcher ? await fetcher() : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) throw new Error('Transcription API failed');

      const data = await response.json();
      const transcribedText = data.text || 'No text transcribed.';

      set(state => ({
        nodes: state.nodes.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                content: transcribedText,
                isLoading: false
              }
            };
          }
          return n;
        })
      }));

      if (boardId && boardId !== 'sample-board' && supabase) {
        await supabase.from('nodes').update({
          content: transcribedText
        }).eq('id', nodeId);
      }

    } catch (err) {
      console.error('Error transcribing file:', err);
      set(state => ({
        nodes: state.nodes.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                content: 'Failed to transcribe file. Check API logs.',
                isLoading: false
              }
            };
          }
          return n;
        })
      }));

      if (boardId && boardId !== 'sample-board' && supabase) {
        await supabase.from('nodes').update({
          content: 'Failed to transcribe file.'
        }).eq('id', nodeId);
      }
    }
  },

  addSelectionBranchNode: (parentNodeId: string, selectedText: string) => {
    const parentNode = get().nodes.find(n => n.id === parentNodeId);
    if (!parentNode) return;

    const parentGen = parentNode.data.generation ?? 0;
    const childGen = parentGen + 1;

    const preferredPosition: XYPosition = {
      x: parentNode.position.x + 360,
      y: parentNode.position.y + (Math.random() - 0.5) * 120
    };
    const position = getNonOverlappingPosition(preferredPosition, get().nodes);

    // Build context chain
    const parentContextChain = parentNode.data.contextChain ?? [];
    const parentContextSummary = parentNode.data.contextSummary;

    let childContextChain: ContextEntry[] = [];
    if (parentContextSummary) {
      const newEntry: ContextEntry = {
        nodeId: parentNodeId,
        summary: parentContextSummary
      };
      childContextChain = [...parentContextChain, newEntry].slice(-3);
    } else {
      // Fallback: parent context not extracted yet
      const parentRawContent = parentNode.data.content || '';
      if (parentRawContent.length > 0) {
        const cleaned = parentRawContent
          .slice(0, 300)
          .replace(/[*#_`\[\]()]/g, '')
          .trim();
        const newEntry: ContextEntry = {
          nodeId: parentNodeId,
          summary: `Context from parent node: "${cleaned}"`
        };
        childContextChain = [...parentContextChain, newEntry].slice(-3);
      } else {
        childContextChain = parentContextChain;
      }
    }

    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    let childId = `node_${Date.now()}`;

    if (boardId && boardId !== 'sample-board' && supabase) {
      supabase
        .from('nodes')
        .insert({
          canvas_id: boardId,
          type: 'branch',
          position_x: position.x,
          position_y: position.y,
          title: selectedText,
          content: selectedText,
          parent_node_id: parentNodeId,
          context_chain: childContextChain,
          context_summary: null
        })
        .select()
        .single()
        .then(({ data: dbNode }) => {
          if (dbNode) {
            childId = dbNode.id;
            supabase.from('edges').insert({
              canvas_id: boardId,
              source_node_id: parentNodeId,
              target_node_id: childId
            })
            .select()
            .single()
            .then(({ data: dbEdge }) => {
              const nextZIndex = get().maxZIndex + 1;
              const childNode: Node<NodeData> = {
                id: childId,
                type: 'llmNode',
                position,
                zIndex: nextZIndex,
                data: {
                  type: 'branch',
                  title: selectedText,
                  content: selectedText,
                  generation: childGen,
                  isLoading: false,
                  isCollapsed: false,
                  parentNodeId,
                  createdAt: dbNode.created_at || new Date().toISOString(),
                  conversationHistory: [],
                  isBranchSelection: true,
                  contextSummary: null,
                  contextChain: childContextChain
                }
              };

              set(state => {
                const exists = state.nodes.some(n => n.id === childId);
                let nextNodes;
                if (exists) {
                  nextNodes = state.nodes.map(n => {
                    if (n.id === childId) {
                      return {
                        ...n,
                        data: {
                          ...n.data,
                          isBranchSelection: true,
                          contextSummary: null,
                          contextChain: childContextChain
                        }
                      };
                    }
                    return n;
                  });
                } else {
                  nextNodes = [...state.nodes, childNode];
                }
                const updatedNodes = computeGenerations(nextNodes);
                const edgeId = dbEdge ? dbEdge.id : `edge_${parentNodeId}_to_${childId}`;
                const newLocalEdge = {
                  id: edgeId,
                  source: parentNodeId,
                  target: childId,
                  animated: true,
                  style: {
                    stroke: getEdgeColorForGen(childGen),
                    strokeWidth: 2.5
                  }
                };
                const updatedEdges = updateEdgesColor([...state.edges, newLocalEdge], updatedNodes);
                return {
                  nodes: updatedNodes,
                  edges: updatedEdges,
                  activeNodeId: childId,
                  newlyCreatedNodeId: childId,
                  showMobileSidebar: false,
                  maxZIndex: nextZIndex
                };
              });
            });
          }
        });
    } else {
      const nextZIndex = get().maxZIndex + 1;
      const childNode: Node<NodeData> = {
        id: childId,
        type: 'llmNode',
        position,
        zIndex: nextZIndex,
        data: {
          type: 'branch',
          title: selectedText,
          content: selectedText,
          generation: childGen,
          isLoading: false,
          isCollapsed: false,
          parentNodeId,
          createdAt: new Date().toISOString(),
          conversationHistory: [],
          isBranchSelection: true,
          contextSummary: null,
          contextChain: childContextChain
        }
      };

      const newEdge: Edge = {
        id: `edge_${parentNodeId}_to_${childId}`,
        source: parentNodeId,
        target: childId,
        animated: true,
        style: {
          stroke: getEdgeColorForGen(childGen),
          strokeWidth: 2.5
        }
      };

      set(state => ({
        nodes: [...state.nodes, childNode],
        edges: [...state.edges, newEdge],
        activeNodeId: childId,
        newlyCreatedNodeId: childId,
        showMobileSidebar: false,
        maxZIndex: nextZIndex
      }));
    }
  },

  triggerNodeOperation: async (nodeId: string, operation: 'explain' | 'expand' | 'shorten') => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return;

    const selectedText = node.data.content;
    let prompt = '';
    let promptTitle = '';

    switch (operation) {
      case 'explain':
        prompt = `Explain the concept of "${selectedText}" clearly and thoroughly. Focus on core architectural details, mechanical components, and concrete examples.`;
        promptTitle = `Explanation: ${selectedText}`;
        break;
      case 'expand':
        prompt = `Provide an exhaustive technical breakdown of "${selectedText}". Detail the underlying mechanics, architectural/protocol specs, and specific implementation details.`;
        promptTitle = `Expansion: ${selectedText}`;
        break;
      case 'shorten':
        prompt = `Summarize "${selectedText}" concisely in a single sentence, packing in high-density technical signal details (e.g. key mechanics, technologies, or specifications) so that the summary is rich and precise.`;
        promptTitle = `Summary: ${selectedText}`;
        break;
    }

    set(state => ({
      nodes: state.nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              isLoading: true,
              title: promptTitle,
              content: '',
              conversationHistory: [{
                role: 'user',
                content: prompt,
                senderId: get().currentUserInfo?.userId,
                sender: get().currentUserInfo ? {
                  username: get().currentUserInfo!.username,
                  avatarColor: get().currentUserInfo!.avatarColor
                } : null
              }]
            }
          };
        }
        return n;
      })
    }));

    const boardId = get().boardId;
    const supabase = get().supabaseClient;

    if (boardId && boardId !== 'sample-board' && supabase) {
      await supabase.from('node_messages').delete().eq('node_id', nodeId);
      await supabase.from('node_messages').insert({
        node_id: nodeId,
        role: 'user',
        content: prompt,
        sender_id: get().currentUserInfo?.userId
      });
      await supabase.from('nodes').update({
        title: promptTitle,
        content: ''
      }).eq('id', nodeId);
    }

    const fetcher = get().clerkTokenFetcher;
    const token = fetcher ? await fetcher() : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const systemPrompt = buildContextAwareSystemPrompt(node.data.contextChain || [], selectedText);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          systemPrompt,
          model: get().selectedModel
        })
      });

      if (!response.ok) throw new Error('API failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });

          set(state => ({
            nodes: state.nodes.map(n => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    content: content
                  }
                };
              }
              return n;
            })
          }));
        }
      }

      // Extract context summary for this node
      let extractedSummary: string | null = null;
      try {
        if (content.trim().length >= 60) {
          extractedSummary = await extractContextSummary(content, promptTitle, token, get().selectedModel);
        }
      } catch (e) {
        console.error('Failed to extract context summary for branch node:', e);
      }

      if (boardId && boardId !== 'sample-board' && supabase) {
        await supabase.from('node_messages').insert({
          node_id: nodeId,
          role: 'assistant',
          content
        });

        const updateData: any = { content };
        if (extractedSummary) {
          updateData.context_summary = extractedSummary;
        }

        await supabase.from('nodes').update(updateData).eq('id', nodeId);
      }

      set(state => ({
        nodes: state.nodes.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                isLoading: false,
                isBranchSelection: false,
                contextSummary: extractedSummary || n.data.contextSummary,
                conversationHistory: [
                  ...n.data.conversationHistory,
                  { role: 'assistant', content }
                ]
              }
            };
          }
          return n;
        })
      }));

    } catch (err) {
      console.error('Error in selection branch operation:', err);
      set(state => ({
        nodes: state.nodes.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                isLoading: false,
                isBranchSelection: false,
                content: 'Failed to complete AI request.'
              }
            };
          }
          return n;
        })
      }));
    }
  },

  deleteNode: async (nodeId: string) => {
    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    const nodeToDelete = get().nodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;

    const edgesToDelete = get().edges.filter(e => e.source === nodeId || e.target === nodeId);

    // Save to local history before deleting
    set(state => ({
      deletedNodesHistory: [
        ...state.deletedNodesHistory,
        { node: nodeToDelete, edges: edgesToDelete }
      ]
    }));

    // Optimistically update local state immediately to ensure snappy UI response
    set(state => {
      const updatedNodes = state.nodes.filter(n => n.id !== nodeId);
      const updatedEdges = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
      return {
        nodes: computeGenerations(updatedNodes),
        edges: updatedEdges,
        activeNodeId: state.activeNodeId === nodeId ? null : state.activeNodeId
      };
    });

    if (boardId && boardId !== 'sample-board' && supabase) {
      const { error } = await supabase.from('nodes').delete().eq('id', nodeId);
      if (error) {
        console.error('Failed to delete node from DB:', error);
      }
    }
  },

  undoDeleteNode: async () => {
    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    const history = get().deletedNodesHistory;

    if (history.length === 0) return;

    // Pop the last deleted node/edges record
    const lastItem = history[history.length - 1];
    const { node, edges } = lastItem;

    // Update history state
    set(state => ({
      deletedNodesHistory: state.deletedNodesHistory.slice(0, -1)
    }));

    // Add back to local state optimistically
    set(state => {
      const nextNodes = [...state.nodes, node];
      const nextEdges = [...state.edges, ...edges];
      return {
        nodes: computeGenerations(nextNodes),
        edges: nextEdges,
        activeNodeId: node.id
      };
    });

    // If online canvas, re-persist back to Supabase DB
    if (boardId && boardId !== 'sample-board' && supabase) {
      try {
        // 1. Re-insert node
        const { error: nodeError } = await supabase
          .from('nodes')
          .insert({
            id: node.id,
            canvas_id: boardId,
            type: node.data.type,
            position_x: node.position.x,
            position_y: node.position.y,
            title: node.data.title,
            content: node.data.content,
            is_collapsed: node.data.isCollapsed,
            parent_node_id: node.data.parentNodeId || null,
            image_url: node.data.imageUrl || null,
            source_file: node.data.sourceFile || null,
            context_summary: node.data.contextSummary || null,
            context_chain: node.data.contextChain || null,
            created_at: node.data.createdAt || new Date().toISOString()
          });

        if (nodeError) {
          console.error('Failed to restore node in DB:', nodeError);
          return;
        }

        // 2. Re-insert edges
        if (edges.length > 0) {
          const edgeInserts = edges.map(e => ({
            id: e.id,
            canvas_id: boardId,
            source_node_id: e.source,
            target_node_id: e.target
          }));

          const { error: edgeError } = await supabase
            .from('edges')
            .insert(edgeInserts);

          if (edgeError) {
            console.error('Failed to restore edges in DB:', edgeError);
          }
        }

        // 3. Re-insert node messages
        if (node.data.conversationHistory && node.data.conversationHistory.length > 0) {
          const messageInserts = node.data.conversationHistory.map(m => ({
            node_id: node.id,
            role: m.role,
            content: m.content,
            sender_id: m.senderId || null
          }));

          const { error: messageError } = await supabase
            .from('node_messages')
            .insert(messageInserts);

          if (messageError) {
            console.error('Failed to restore node messages in DB:', messageError);
          }
        }
      } catch (err) {
        console.error('Exception restoring node/edges in DB:', err);
      }
    }
  },

  updateNodeData: async (nodeId: string, updates: Partial<NodeData>) => {
    set(state => ({
      nodes: state.nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: { ...n.data, ...updates }
          };
        }
        return n;
      })
    }));

    const boardId = get().boardId;
    const supabase = get().supabaseClient;

    if (boardId && boardId !== 'sample-board' && supabase) {
      const dbUpdates: Partial<DbNode> = {};
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.isCollapsed !== undefined) dbUpdates.is_collapsed = updates.isCollapsed;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      if (updates.sourceFile !== undefined) dbUpdates.source_file = updates.sourceFile;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('nodes')
          .update(dbUpdates)
          .eq('id', nodeId);
        if (error) {
          console.error('Failed to update node in DB:', error);
        }
      }
    }
  },

  collapseNode: (nodeId: string) => {
    get().updateNodeData(nodeId, { isCollapsed: true });
  },

  expandNode: (nodeId: string) => {
    get().updateNodeData(nodeId, { isCollapsed: false });
  },

  // Action: Synthesis/Merge Node
  addMergeNode: async (nodeIds: string[], userPrompt?: string) => {
    if (nodeIds.length < 2) return;
    
    const selectedNodes = get().nodes.filter(n => nodeIds.includes(n.id));
    if (selectedNodes.length === 0) return;

    let sumX = 0, sumY = 0;
    selectedNodes.forEach(n => {
      sumX += n.position.x;
      sumY += n.position.y;
    });

    const preferredPosition = {
      x: sumX / selectedNodes.length,
      y: sumY / selectedNodes.length + 200
    };
    const position = getNonOverlappingPosition(preferredPosition, get().nodes);

    const maxGen = Math.max(...selectedNodes.map(n => n.data.generation ?? 0));
    const childGen = maxGen + 1;

    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    let mergeId = `node_${Date.now()}`;

    if (boardId && boardId !== 'sample-board' && supabase) {
      const { data: dbNode, error: nodeError } = await supabase
        .from('nodes')
        .insert({
          canvas_id: boardId,
          type: 'merge',
          position_x: position.x,
          position_y: position.y,
          title: 'Merged Synthesis',
          content: ''
        })
        .select()
        .single();

      if (nodeError || !dbNode) {
        console.error('Failed to create merge node in DB:', nodeError);
        return;
      }

      mergeId = dbNode.id;

      const edgeInserts = selectedNodes.map(n => ({
        canvas_id: boardId,
        source_node_id: n.id,
        target_node_id: mergeId
      }));

      const { data: dbEdges } = await supabase
        .from('edges')
        .insert(edgeInserts)
        .select();

      const nextZIndex = get().maxZIndex + 1;
      const mergeNode: Node<NodeData> = {
        id: mergeId,
        type: 'llmNode',
        position,
        zIndex: nextZIndex,
        data: {
          type: 'merge',
          title: 'Merged Synthesis',
          content: '',
          generation: childGen,
          isLoading: true,
          isCollapsed: false,
          conversationHistory: [],
          createdAt: dbNode.created_at || new Date().toISOString()
        }
      };

      const newEdges = selectedNodes.map(n => {
        const matchingDbEdge = dbEdges?.find(e => e.source_node_id === n.id && e.target_node_id === mergeId);
        const edgeId = matchingDbEdge ? matchingDbEdge.id : `edge_${n.id}_to_${mergeId}`;
        return {
          id: edgeId,
          source: n.id,
          target: mergeId,
          animated: true,
          style: {
            stroke: getEdgeColorForGen(childGen),
            strokeWidth: 2.5
          }
        };
      });

      set(state => {
        const existsNode = state.nodes.some(n => n.id === mergeId);
        const updatedNodes = existsNode 
          ? state.nodes.map(n => n.id === mergeId ? { ...n, data: { ...n.data, isLoading: true } } : n)
          : computeGenerations([...state.nodes, mergeNode]);

        let nextEdges = state.edges;
        newEdges.forEach(newEdge => {
          const existsEdge = nextEdges.some(e => e.id === newEdge.id);
          if (!existsEdge) {
            nextEdges = [...nextEdges, newEdge];
          }
        });
        const updatedEdges = updateEdgesColor(nextEdges, updatedNodes);

        return {
          nodes: updatedNodes,
          edges: updatedEdges,
          activeNodeId: mergeId,
          newlyCreatedNodeId: mergeId,
          showMobileSidebar: false,
          maxZIndex: nextZIndex
        };
      });

      const fetcher = get().clerkTokenFetcher;
      const token = fetcher ? await fetcher() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await fetch('/api/merge', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nodes: selectedNodes.map(n => ({ title: n.data.title, content: n.data.content })),
            userPrompt,
            model: get().selectedModel
          })
        });

        if (!response.ok) throw new Error('API merge failed');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let content = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            content += decoder.decode(value, { stream: true });

            set(state => ({
              nodes: state.nodes.map(n => {
                if (n.id === mergeId) {
                  return {
                    ...n,
                    data: { ...n.data, content }
                  };
                }
                return n;
              })
            }));
          }
        }

        await supabase.from('node_messages').insert({
          node_id: mergeId,
          role: 'assistant',
          content
        });

        await supabase.from('nodes').update({
          content
        }).eq('id', mergeId);

        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === mergeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  isLoading: false,
                  conversationHistory: [
                    { role: 'assistant', content }
                  ]
                }
              };
            }
            return n;
          })
        }));

      } catch (err) {
        console.error('Synthesis failed:', err);
        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === mergeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  content: 'Failed to synthesize nodes.',
                  isLoading: false
                }
              };
            }
            return n;
          })
        }));
      }

    } else {
      const nextZIndex = get().maxZIndex + 1;
      const mergeNode: Node<NodeData> = {
        id: mergeId,
        type: 'llmNode',
        position,
        zIndex: nextZIndex,
        data: {
          type: 'merge',
          title: 'Merged Synthesis',
          content: '',
          generation: childGen,
          isLoading: true,
          isCollapsed: false,
          conversationHistory: [],
          createdAt: new Date().toISOString()
        }
      };

      const newEdges = selectedNodes.map(n => ({
        id: `edge_${n.id}_to_${mergeId}`,
        source: n.id,
        target: mergeId,
        animated: true,
        style: {
          stroke: getEdgeColorForGen(childGen),
          strokeWidth: 2.5
        }
      }));

      set(state => ({
        nodes: [...state.nodes, mergeNode],
        edges: [...state.edges, ...newEdges],
        activeNodeId: mergeId,
        newlyCreatedNodeId: mergeId,
        showMobileSidebar: false,
        maxZIndex: nextZIndex
      }));

      const fetcher = get().clerkTokenFetcher;
      const token = fetcher ? await fetcher() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await fetch('/api/merge', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            nodes: selectedNodes.map(n => ({ title: n.data.title, content: n.data.content })),
            userPrompt,
            model: get().selectedModel
          })
        });

        if (!response.ok) throw new Error('API merge failed');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let content = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            content += decoder.decode(value, { stream: true });

            set(state => ({
              nodes: state.nodes.map(n => {
                if (n.id === mergeId) {
                  return {
                    ...n,
                    data: { ...n.data, content }
                  };
                }
                return n;
              })
            }));
          }
        }

        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === mergeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  isLoading: false,
                  conversationHistory: [
                    { role: 'assistant', content }
                  ]
                }
              };
            }
            return n;
          })
        }));

      } catch (err) {
        console.error('Synthesis failed:', err);
        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === mergeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  content: 'Failed to synthesize nodes.',
                  isLoading: false
                }
              };
            }
            return n;
          })
        }));
      }
    }
  },

  createNewBoard: (name?: string) => {
    const boardTitle = name || 'Untitled Board';
    set({
      nodes: [],
      edges: [],
      boardId: `board_${Date.now()}`,
      boardName: boardTitle,
      activeNodeId: null,
      showMobileSidebar: false
    });
  },

  loadBoard: (boardId: string) => {
    const isSample = boardId === 'sample-board';
    set({
      boardId,
      nodes: isSample ? getSampleBoardNodes() : [],
      edges: isSample ? getSampleBoardEdges() : [],
      boardName: isSample ? 'Quantum Computing Ideas' : 'New Board',
      activeNodeId: null,
      showMobileSidebar: false
    });
  },

  loadCanvasFromDB: async (canvasId: string) => {
    const supabase = get().supabaseClient;
    if (!supabase) return;

    set({ isSaving: true, isLoadingCanvas: true });
    try {
      const { data: canvas, error: canvasError } = await supabase
        .from('canvases')
        .select('*')
        .eq('id', canvasId)
        .single();

      if (canvasError || !canvas) {
        console.error('Error loading canvas:', canvasError?.message || canvasError, 'Code:', canvasError?.code, 'Details:', canvasError?.details);
        set({ isSaving: false, isLoadingCanvas: false });
        return;
      }

      const { data: dbNodes, error: nodesError } = await supabase
        .from('nodes')
        .select('*')
        .eq('canvas_id', canvasId);

      if (nodesError) {
        console.error('loadCanvasFromDB: nodesError:', nodesError);
        throw nodesError;
      }

      const { data: dbEdges, error: edgesError } = await supabase
        .from('edges')
        .select('*')
        .eq('canvas_id', canvasId);

      if (edgesError) {
        console.error('loadCanvasFromDB: edgesError:', edgesError);
        throw edgesError;
      }

      console.log('loadCanvasFromDB: raw dbNodes count:', dbNodes?.length, 'raw dbEdges count:', dbEdges?.length);

      const nodeIds = (dbNodes || []).map(n => n.id);
      let dbMessages: DbMessage[] = [];
      if (nodeIds.length > 0) {
        const { data: messagesData, error: messagesError } = await supabase
          .from('node_messages')
          .select('*, sender:users(id, username, avatar_color)')
          .in('node_id', nodeIds)
          .order('created_at', { ascending: true });
        if (messagesError) throw messagesError;
        dbMessages = messagesData || [];
      }

      const messagesMap = new Map<string, DbMessage[]>();
      dbMessages.forEach(msg => {
        if (!messagesMap.has(msg.node_id)) {
          messagesMap.set(msg.node_id, []);
        }
        messagesMap.get(msg.node_id)!.push(msg);
      });

      const mappedNodes = (dbNodes || []).map(n => 
        mapDbNodeToReactFlow(n, messagesMap.get(n.id) || [])
      );

      const nodesWithGen = computeGenerations(mappedNodes);

      const mappedEdges = (dbEdges || []).map(e => {
        const targetNode = nodesWithGen.find(n => n.id === e.target_node_id);
        const targetGen = targetNode?.data.generation ?? 1;
        console.log(`loadCanvasFromDB mapping edge: ${e.id}, source: ${e.source_node_id}, target: ${e.target_node_id}, targetNode found: ${!!targetNode}, targetGen: ${targetGen}`);
        return mapDbEdgeToReactFlow(e, targetGen);
      });

      console.log('loadCanvasFromDB final mappedNodes count:', nodesWithGen.length, 'mappedEdges count:', mappedEdges.length);

      // Fetch user role
      let userRole: 'owner' | 'editor' | null = null;
      const userInfo = get().currentUserInfo;
      if (userInfo) {
        const { data: member } = await supabase
          .from('canvas_members')
          .select('role')
          .eq('canvas_id', canvasId)
          .eq('user_id', userInfo.userId)
          .maybeSingle();
        if (member) {
          userRole = member.role as 'owner' | 'editor';
        }
      }

      set({
        boardId: canvas.id,
        boardName: canvas.name,
        nodes: nodesWithGen,
        edges: mappedEdges,
        userRole,
        isSaving: false,
        isLoadingCanvas: false,
        maxZIndex: 10 + nodesWithGen.length
      });
    } catch (e) {
      console.error('Failed to load board from DB:', e);
      set({ isSaving: false, isLoadingCanvas: false });
    }
  },

  subscribeToCanvas: async (
    canvasId: string, 
    getToken: () => Promise<string | null>,
    userInfo?: { userId: string; username: string; avatarColor: string },
    getRawToken?: () => Promise<string | null>
  ) => {
    const supabase = getSupabaseClient(getToken);

    // 1. Clean up any existing channel in store
    const currentChannel = get().realtimeChannel;
    if (currentChannel) {
      if (get().boardId === canvasId && get().currentUserInfo?.userId === userInfo?.userId) {
        return;
      }
      await supabase.removeChannel(currentChannel);
    }

    // Reset store state for the new canvas to avoid showing previous canvas data
    set({
      supabaseClient: supabase,
      realtimeChannel: null,
      boardId: canvasId,
      boardName: 'Untitled Canvas',
      nodes: [],
      edges: [],
      activeNodeId: null,
      showMobileSidebar: false,
      presenceUsers: [],
      otherUsersCursors: {},
      userRole: null,
      currentUserInfo: userInfo || null,
      isLoadingCanvas: true,
      clerkTokenFetcher: getRawToken || getToken
    });

    if (canvasId === 'sample-board' || canvasId === 'default-board') {
      set({
        supabaseClient: null,
        isLoadingCanvas: true
      });
      get().loadBoard(canvasId);
      set({ isLoadingCanvas: false });
      return;
    }

    // 2. Trigger initial database load in the background (asynchronously)
    get().loadCanvasFromDB(canvasId);

    // 3. Use a fixed channel name so all users on the same canvas collaborate in the same channel room
    const channelName = `canvas:${canvasId}`;

    // 4. Create and subscribe channel
    let channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userInfo?.userId || 'anonymous'
        }
      }
    });

    channel = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nodes',
          filter: `canvas_id=eq.${canvasId}`
        },
        async (payload) => {
          console.log('REALTIME EVENT nodes payload:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;
          const dbNode = newRecord as DbNode;
          const oldDbNode = oldRecord as DbNode;
          
          if (eventType === 'INSERT') {
            const exists = get().nodes.some(n => n.id === dbNode.id);
            console.log('REALTIME EVENT nodes INSERT. Node ID:', dbNode.id, 'exists locally?', exists);
            if (exists) return;

            const { data: msgs } = await supabase
              .from('node_messages')
              .select('*, sender:users(id, username, avatar_color)')
              .eq('node_id', dbNode.id)
              .order('created_at', { ascending: true });

            const nextZIndex = get().maxZIndex + 1;
            const newRFNode = mapDbNodeToReactFlow(dbNode, msgs || []);
            newRFNode.zIndex = nextZIndex;
            console.log('REALTIME EVENT nodes INSERT. Created React Flow Node with zIndex:', newRFNode);
            
            set(state => {
              const updatedNodes = computeGenerations([...state.nodes, newRFNode]);
              const updatedEdges = updateEdgesColor(state.edges, updatedNodes);
              console.log('REALTIME EVENT nodes INSERT. Setting state. nodes count:', updatedNodes.length, 'edges count:', updatedEdges.length);
              return {
                nodes: updatedNodes,
                edges: updatedEdges,
                maxZIndex: nextZIndex
              };
            });
          } else if (eventType === 'UPDATE') {
            let wasSelfEcho = false;
            set(state => {
              const updatedNodes = state.nodes.map(n => {
                if (n.id === dbNode.id) {
                  const isLoading = n.data.isLoading;
                  const conversationHistory = n.data.conversationHistory;

                  // Detect if this change is a self-echo (local state is already matching the database)
                  const isPosSame = Math.abs(n.position.x - dbNode.position_x) < 1 && Math.abs(n.position.y - dbNode.position_y) < 1;
                  const isWidthSame = (!n.width && !dbNode.width) || (n.width && dbNode.width && Math.abs((n.width as number) - dbNode.width) < 1);
                  const isHeightSame = (!n.height && !dbNode.height) || (n.height && dbNode.height && Math.abs((n.height as number) - dbNode.height) < 1);
                  const isMetadataSame = n.data.type === dbNode.type && 
                                         n.data.title === dbNode.title && 
                                         n.data.content === dbNode.content && 
                                         n.data.isCollapsed === dbNode.is_collapsed && 
                                         n.data.imageUrl === dbNode.image_url && 
                                         n.data.sourceFile === dbNode.source_file;
                  
                  if (isPosSame && isWidthSame && isHeightSame && isMetadataSame) {
                    wasSelfEcho = true;
                  }

                  // If dragging locally, do not overwrite coordinates or sizes
                  const nextWidth = n.dragging ? (n.width ?? undefined) : (dbNode.width ?? undefined);
                  const nextHeight = n.dragging ? (n.height ?? undefined) : (dbNode.is_collapsed ? undefined : (dbNode.height ?? undefined));
                  const nextPosition = n.dragging ? n.position : { x: dbNode.position_x, y: dbNode.position_y };

                  // Handle type mapping (keep local type if it was question/note and db returned llm)
                  let nextType = dbNode.type as NodeType;
                  if (nextType === 'llm' && (n.data.type === 'question' || n.data.type === 'note')) {
                    nextType = n.data.type;
                  }

                  // Prevent overwriting local content with empty content if local content exists,
                  // or if the node is currently loading/streaming.
                  let nextContent = n.data.content;
                  if (!isLoading) {
                    if (dbNode.content !== undefined) {
                      if (dbNode.content !== '' || n.data.content === '') {
                        nextContent = dbNode.content;
                      }
                    }
                  }

                  // Determine branch selection state
                  const nextIsBranchSelection = nextType === 'branch'
                    ? (dbNode.title === dbNode.content && !conversationHistory.some(m => m.role === 'assistant'))
                    : false;

                  return {
                    ...n,
                    position: nextPosition,
                    width: nextWidth,
                    height: nextHeight,
                    style: {
                      ...n.style,
                      width: nextWidth,
                      height: nextHeight
                    },
                    data: {
                      ...n.data,
                      type: nextType,
                      title: dbNode.title,
                      content: nextContent,
                      isCollapsed: dbNode.is_collapsed,
                      parentNodeId: dbNode.parent_node_id || undefined,
                      imageUrl: dbNode.image_url || undefined,
                      sourceFile: dbNode.source_file || undefined,
                      isLoading,
                      isBranchSelection: nextIsBranchSelection,
                      conversationHistory,
                      contextSummary: dbNode.context_summary !== undefined ? dbNode.context_summary : n.data.contextSummary,
                      contextChain: dbNode.context_chain !== undefined ? dbNode.context_chain : n.data.contextChain,
                      justUpdated: !wasSelfEcho && !n.dragging
                    }
                  };
                }
                return n;
              });
              
              const nodesWithGen = computeGenerations(updatedNodes);
              const updatedEdges = updateEdgesColor(state.edges, nodesWithGen);
              return {
                nodes: nodesWithGen,
                edges: updatedEdges
              };
            });

            // Remove node update visual indicator after 2 seconds (only if we flashed it)
            if (!wasSelfEcho) {
              setTimeout(() => {
                set(state => ({
                  nodes: state.nodes.map(n => {
                    if (n.id === dbNode.id) {
                      return {
                        ...n,
                        data: { ...n.data, justUpdated: false }
                      };
                    }
                    return n;
                  })
                }));
              }, 2000);
            }

          } else if (eventType === 'DELETE') {
            set(state => {
              const updatedNodes = state.nodes.filter(n => n.id !== oldDbNode.id);
              const updatedEdges = state.edges.filter(e => e.source !== oldDbNode.id && e.target !== oldDbNode.id);
              return {
                nodes: computeGenerations(updatedNodes),
                edges: updatedEdges
              };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'edges',
          filter: `canvas_id=eq.${canvasId}`
        },
        (payload) => {
          console.log('REALTIME EVENT edges payload:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;
          const dbEdge = newRecord as DbEdge;
          const oldDbEdge = oldRecord as DbEdge;

          if (eventType === 'INSERT') {
            const exists = get().edges.some(e => e.id === dbEdge.id);
            console.log('REALTIME EVENT edges INSERT. Edge ID:', dbEdge?.id, 'exists locally?', exists);
            if (exists) return;

            const targetNode = get().nodes.find(n => n.id === dbEdge.target_node_id);
            const targetGen = targetNode?.data.generation ?? 1;
            console.log(`REALTIME EVENT edges INSERT. Target node found in state? ${!!targetNode}, targetGen: ${targetGen}`);
            const newRFEdge = mapDbEdgeToReactFlow(dbEdge, targetGen);
            console.log('REALTIME EVENT edges INSERT. Created React Flow Edge:', newRFEdge);

            set(state => {
              const nextEdges = [...state.edges, newRFEdge];
              console.log('REALTIME EVENT edges INSERT. Setting state edges count:', nextEdges.length);
              return {
                edges: nextEdges
              };
            });
          } else if (eventType === 'DELETE') {
            console.log('REALTIME EVENT edges DELETE. Edge ID:', oldDbEdge?.id);
            set(state => ({
              edges: state.edges.filter(e => e.id !== oldDbEdge.id)
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvases',
          filter: `id=eq.${canvasId}`
        },
        (payload) => {
          const { new: newRecord } = payload;
          set({
            boardName: newRecord.name
          });
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const activeUsers: Array<{ userId: string; username: string; avatarColor: string }> = [];
        Object.keys(presenceState).forEach(key => {
          const userPresences = presenceState[key] as unknown as Array<{ username: string; avatarColor: string }>;
          if (userPresences && userPresences[0]) {
            activeUsers.push({
              userId: key,
              username: userPresences[0].username,
              avatarColor: userPresences[0].avatarColor
            });
          }
        });
        set({ presenceUsers: activeUsers });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        set(state => {
          const nextCursors = { ...state.otherUsersCursors };
          delete nextCursors[key];
          return { otherUsersCursors: nextCursors };
        });
      })
      .on('broadcast', { event: 'cursor-move' }, (payload) => {
        const { userId, username, avatarColor, x, y } = payload.payload;
        if (userId === userInfo?.userId) return;
        set(state => ({
          otherUsersCursors: {
            ...state.otherUsersCursors,
            [userId]: { username, avatarColor, x, y }
          }
        }));
      });

    // Set authentication token on the realtime client explicitly before subscribing
    try {
      const token = await getToken();
      if (token) {
        await supabase.realtime.setAuth(token);
      }
    } catch (err) {
      console.error('Failed to set realtime connection auth token:', err);
    }

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && userInfo) {
        await channel.track({
          userId: userInfo.userId,
          username: userInfo.username,
          avatarColor: userInfo.avatarColor
        });
      }
    });

    set({ realtimeChannel: channel });
  },

  broadcastCursor: (x: number, y: number) => {
    const channel = get().realtimeChannel;
    const user = get().currentUserInfo;
    if (!channel || !user || channel.state !== 'joined') return;

    channel.send({
      type: 'broadcast',
      event: 'cursor-move',
      payload: {
        userId: user.userId,
        username: user.username,
        avatarColor: user.avatarColor,
        x,
        y
      }
    });
  },

  unsubscribeFromCanvas: () => {
    const channel = get().realtimeChannel;
    const supabase = get().supabaseClient;
    if (channel) {
      channel.unsubscribe();
      if (supabase) {
        supabase.removeChannel(channel);
      }
    }
    set({
      realtimeChannel: null,
      supabaseClient: null
    });
  },

  updateNodeSizeLocally: (nodeId: string, width: number, height: number) => {
    set(state => ({
      nodes: state.nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            width,
            height,
            style: {
              ...n.style,
              width,
              height
            }
          };
        }
        return n;
      })
    }));
  },

  updateNodeSize: async (nodeId: string, width: number, height: number) => {
    const boardId = get().boardId;
    const supabase = get().supabaseClient;
    if (!boardId || boardId === 'sample-board' || !supabase) return;

    try {
      await fetch('/api/canvas/update-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasId: boardId,
          nodeId,
          width,
          height
        })
      });
    } catch (e) {
      console.error('Failed to persist node size:', e);
    }
  },

  queuePositionUpdate: (nodeId: string, x: number, y: number) => {
    const boardId = get().boardId;
    if (!boardId || boardId === 'sample-board') return;

    const now = Date.now();
    const throttleLimit = 400; // ms
    const pending = pendingUpdates.get(nodeId);

    const sendUpdate = async (updateX: number, updateY: number) => {
      pendingUpdates.delete(nodeId);
      try {
        await fetch('/api/canvas/update-position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canvasId: boardId,
            nodeId,
            positionX: updateX,
            positionY: updateY
          })
        });
      } catch (e) {
        console.error('Failed to persist node position:', e);
      }
    };

    if (pending) {
      clearTimeout(pending.timeoutId);
      const timeSinceLastSend = now - pending.lastSentTime;

      if (timeSinceLastSend >= throttleLimit) {
        sendUpdate(x, y);
        pendingUpdates.set(nodeId, {
          x,
          y,
          timeoutId: setTimeout(() => sendUpdate(x, y), throttleLimit),
          lastSentTime: now
        });
      } else {
        const timeoutId = setTimeout(() => sendUpdate(x, y), throttleLimit - timeSinceLastSend);
        pendingUpdates.set(nodeId, {
          x,
          y,
          timeoutId,
          lastSentTime: pending.lastSentTime
        });
      }
    } else {
      const timeoutId = setTimeout(() => sendUpdate(x, y), throttleLimit);
      pendingUpdates.set(nodeId, {
        x,
        y,
        timeoutId,
        lastSentTime: now
      });
    }
  },

  organizeCanvas: async () => {
    const nodes = get().nodes;
    const edges = get().edges;
    const boardId = get().boardId;
    const supabase = get().supabaseClient;

    if (nodes.length === 0) return;

    const newPositions = organizeNodes(nodes, edges);

    const updatedNodes = nodes.map(n => {
      const pos = newPositions.get(n.id);
      if (pos) {
        return {
          ...n,
          position: pos
        };
      }
      return n;
    });

    set({ nodes: updatedNodes });

    if (boardId && boardId !== 'sample-board' && supabase) {
      const updates = Array.from(newPositions.entries()).map(([nodeId, pos]) => ({
        nodeId,
        positionX: pos.x,
        positionY: pos.y
      }));

      try {
        await fetch('/api/canvas/update-position', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canvasId: boardId,
            updates
          })
        });
      } catch (e) {
        console.error('Failed to persist organized canvas positions:', e);
      }
    }
  }
}));

// Prepopulated canvas nodes (matching uploaded space-S visual reference)
function getSampleBoardNodes(): Node<NodeData>[] {
  return [
    {
      id: 'n1',
      type: 'llmNode',
      position: { x: 180, y: 150 },
      data: {
        type: 'llm',
        title: 'Quantum Computing Basics',
        content: 'Quantum computing uses qubits that can exist in multiple states simultaneously (superposition), allowing them to compute certain algorithms exponentially faster than classical computers.',
        generation: 0, // Root Node
        isLoading: false,
        isCollapsed: false,
        conversationHistory: [
          { role: 'user', content: 'What is quantum computing?' },
          { role: 'assistant', content: 'Quantum computing uses qubits that can exist in multiple states simultaneously (superposition)...' }
        ],
        createdAt: '2026-06-20T10:00:00.000Z'
      }
    },
    {
      id: 'n2',
      type: 'llmNode',
      position: { x: 120, y: 520 },
      data: {
        type: 'doc',
        title: 'Nielsen & Chuang (Textbook)',
        content: 'Transcribed textbook chapters detailing core quantum information algorithms, Deutsch-Jozsa algorithm, and quantum teleportation gates.',
        sourceFile: 'Nielsen_Chuang_Quantum.pdf',
        generation: 0,
        isLoading: false,
        isCollapsed: false,
        conversationHistory: [],
        createdAt: '2026-06-20T10:01:00.000Z'
      }
    },
    {
      id: 'n3',
      type: 'llmNode',
      position: { x: 480, y: 120 },
      data: {
        type: 'note',
        title: 'Superposition',
        content: 'Qubits can be in state |0⟩ and state |1⟩ simultaneously until measured, yielding a linear combination α|0⟩ + β|1⟩.',
        generation: 1, // Gen 1 (Child of n1)
        isLoading: false,
        isCollapsed: false,
        conversationHistory: [],
        createdAt: '2026-06-20T10:02:00.000Z'
      }
    },
    {
      id: 'n4',
      type: 'llmNode',
      position: { x: 440, y: 500 },
      data: {
        type: 'llm',
        title: 'Applications of Quantum Computing',
        content: 'Quantum computers have promising potential in cryptography (Shor\'s algorithm breaking RSA), pharmaceutical drug discovery, linear system modeling, and optimization.',
        generation: 1, // Gen 1 (Child of n1 & n2)
        isLoading: false,
        isCollapsed: false,
        conversationHistory: [],
        createdAt: '2026-06-20T10:03:00.000Z'
      }
    },
    {
      id: 'n5',
      type: 'llmNode',
      position: { x: 780, y: 150 },
      data: {
        type: 'image',
        title: 'Bloch Sphere Visualization',
        content: 'Generating bloch sphere visual mapping representation.',
        imageUrl: '/bloch_sphere.png',
        imagePrompt: '3D Bloch sphere representation showing vector states for qubits',
        generation: 2, // Gen 2 (Child of n3)
        isLoading: false,
        isCollapsed: false,
        conversationHistory: [],
        createdAt: '2026-06-20T10:04:00.000Z'
      }
    },
    {
      id: 'n6',
      type: 'llmNode',
      position: { x: 740, y: 480 },
      data: {
        type: 'question',
        title: 'How does quantum entanglement work?',
        content: 'Explain in simple terms how two qubits can become entangled such that the state of one instantly determines the state of the other.',
        generation: 2, // Gen 2 (Child of n4)
        isLoading: false,
        isCollapsed: false,
        conversationHistory: [],
        createdAt: '2026-06-20T10:05:00.000Z'
      }
    }
  ];
}

function getSampleBoardEdges(): Edge[] {
  return [
    {
      id: 'edge_n1_to_n3',
      source: 'n1',
      target: 'n3',
      animated: true,
      style: { stroke: getEdgeColorForGen(1), strokeWidth: 2.5 }
    },
    {
      id: 'edge_n1_to_n4',
      source: 'n1',
      target: 'n4',
      animated: true,
      style: { stroke: getEdgeColorForGen(1), strokeWidth: 2.5 }
    },
    {
      id: 'edge_n2_to_n4',
      source: 'n2',
      target: 'n4',
      animated: true,
      style: { stroke: getEdgeColorForGen(1), strokeWidth: 2.5 }
    },
    {
      id: 'edge_n3_to_n5',
      source: 'n3',
      target: 'n5',
      animated: true,
      style: { stroke: getEdgeColorForGen(2), strokeWidth: 2.5 }
    },
    {
      id: 'edge_n4_to_n6',
      source: 'n4',
      target: 'n6',
      animated: true,
      style: { stroke: getEdgeColorForGen(2), strokeWidth: 2.5 }
    }
  ];
}
