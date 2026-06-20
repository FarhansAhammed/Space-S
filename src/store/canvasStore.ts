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

export type NodeType = 'llm' | 'branch' | 'merge' | 'image' | 'doc' | 'question' | 'note';

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
  isBranchSelection?: boolean;
  justUpdated?: boolean;
  createdAt?: string;
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

  // Supabase Integration State
  supabaseClient: SupabaseClient | null;
  realtimeChannel: RealtimeChannel | null;

  // Presence and cursors state
  presenceUsers: Array<{ userId: string; username: string; avatarColor: string }>;
  otherUsersCursors: Record<string, { username: string; avatarColor: string; x: number; y: number }>;
  userRole: 'owner' | 'editor' | null;
  currentUserInfo: { userId: string; username: string; avatarColor: string } | null;
  maxZIndex: number;

  // Actions
  toggleTheme: () => void;
  selectNode: (nodeId: string | null) => Promise<void>;
  addLLMNodeFromSearch: (prompt: string) => Promise<void>;
  deriveNode: (parentNodeId: string, type: NodeType, prompt: string, title?: string) => Promise<void>;
  continueNodeConversation: (nodeId: string, prompt: string) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
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
    userInfo?: { userId: string; username: string; avatarColor: string }
  ) => Promise<void>;
  unsubscribeFromCanvas: () => void;
  queuePositionUpdate: (nodeId: string, x: number, y: number) => void;
  updateNodeSizeLocally: (nodeId: string, width: number, height: number) => void;
  updateNodeSize: (nodeId: string, width: number, height: number) => Promise<void>;
  setNewlyCreatedNodeId: (nodeId: string | null) => void;
  addSelectionBranchNode: (parentNodeId: string, selectedText: string) => void;
  triggerNodeOperation: (nodeId: string, operation: 'explain' | 'expand' | 'shorten') => Promise<void>;
  broadcastCursor: (x: number, y: number) => void;
  organizeCanvas: () => Promise<void>;
  clerkTokenFetcher: (() => Promise<string | null>) | null;
}

// Helpers
const getEdgeColorForGen = (gen: number) => {
  switch (gen) {
    case 1: return '#7c4dff'; // Purple / Parent -> Child
    case 2: return '#00b8d4'; // Teal / Child -> Grandchild
    case 3: return '#ff9100'; // Orange / Grandchild -> Great-Grandchild
    case 4: return '#ff1744'; // Rose / Great-Grandchild -> GGreat-Grandchild
    default: return '#607d8b'; // Slate Gray / Deep gen
  }
};

const mapDbNodeToReactFlow = (dbNode: DbNode, messages: DbMessage[] = []): Node<NodeData> => {
  const nodeType = dbNode.type as NodeType;
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
      sourceFile: dbNode.source_file || undefined,
      createdAt: dbNode.created_at,
      conversationHistory: messages.map(m => ({
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
  theme: 'light',
  supabaseClient: null,
  realtimeChannel: null,
  presenceUsers: [],
  otherUsersCursors: {},
  userRole: null,
  currentUserInfo: null,
  newlyCreatedNodeId: null,
  maxZIndex: 10,
  clerkTokenFetcher: null,
  setNewlyCreatedNodeId: (nodeId: string | null) => set({ newlyCreatedNodeId: nodeId }),

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
        set(state => ({
          edges: state.edges.map(e => e.id === tempEdgeId ? { ...e, id: dbEdge.id } : e)
        }));
      }
    }
  },

  selectNode: async (nodeId: string | null) => {
    set({ activeNodeId: nodeId });

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

    const position: XYPosition = {
      x: viewportWidth / 2 - 150,
      y: viewportHeight / 2 - 100,
    };

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

      set(state => ({
        nodes: computeGenerations([...state.nodes, parentNode]),
        activeNodeId: nodeId,
        newlyCreatedNodeId: nodeId,
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
            messages: [{ role: 'user', content: prompt }]
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

        await supabase.from('nodes').update({
          content
        }).eq('id', nodeId);

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
            messages: [{ role: 'user', content: prompt }]
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

  // Action: Derive child / grandchild from an existing node
  deriveNode: async (parentNodeId: string, type: NodeType, prompt: string, title?: string) => {
    const parentNode = get().nodes.find(n => n.id === parentNodeId);
    if (!parentNode) return;

    const parentGen = parentNode.data.generation ?? 0;
    const childGen = parentGen + 1;

    const position: XYPosition = {
      x: parentNode.position.x + 360,
      y: parentNode.position.y + (Math.random() - 0.5) * 160
    };

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
          parent_node_id: parentNodeId
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
        const updatedNodes = computeGenerations([...state.nodes, childNode]);
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
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }]
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

        await supabase.from('nodes').update({
          content
        }).eq('id', childId);

        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === childId) {
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
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }]
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

        set(state => ({
          nodes: state.nodes.map(n => {
            if (n.id === childId) {
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: updatedHistory
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

      if (boardId && boardId !== 'sample-board' && supabase) {
        await supabase.from('node_messages').insert({
          node_id: nodeId,
          role: 'assistant',
          content
        });

        await supabase.from('nodes').update({
          content
        }).eq('id', nodeId);
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

  addSelectionBranchNode: (parentNodeId: string, selectedText: string) => {
    const parentNode = get().nodes.find(n => n.id === parentNodeId);
    if (!parentNode) return;

    const parentGen = parentNode.data.generation ?? 0;
    const childGen = parentGen + 1;

    const position: XYPosition = {
      x: parentNode.position.x + 360,
      y: parentNode.position.y + (Math.random() - 0.5) * 120
    };

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
          parent_node_id: parentNodeId
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
                  isBranchSelection: true
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
                          isBranchSelection: true
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
          isBranchSelection: true
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
        prompt = `Explain this concept in simple terms: "${selectedText}"`;
        promptTitle = `Explanation: ${selectedText}`;
        break;
      case 'expand':
        prompt = `Expand on this in detail, providing key aspects: "${selectedText}"`;
        promptTitle = `Expansion: ${selectedText}`;
        break;
      case 'shorten':
        prompt = `Summarize this concept concisely in a single sentence: "${selectedText}"`;
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
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

      if (boardId && boardId !== 'sample-board' && supabase) {
        await supabase.from('node_messages').insert({
          node_id: nodeId,
          role: 'assistant',
          content
        });
        await supabase.from('nodes').update({
          content
        }).eq('id', nodeId);
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

    const position = {
      x: sumX / selectedNodes.length,
      y: sumY / selectedNodes.length + 200
    };

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
          conversationHistory: []
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
        const updatedNodes = computeGenerations([...state.nodes, mergeNode]);
        const updatedEdges = updateEdgesColor([...state.edges, ...newEdges], updatedNodes);
        return {
          nodes: updatedNodes,
          edges: updatedEdges,
          activeNodeId: mergeId,
          newlyCreatedNodeId: mergeId,
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
            userPrompt
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
          conversationHistory: []
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
            userPrompt
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
      activeNodeId: null
    });
  },

  loadBoard: (boardId: string) => {
    const isSample = boardId === 'sample-board';
    set({
      boardId,
      nodes: isSample ? getSampleBoardNodes() : [],
      edges: isSample ? getSampleBoardEdges() : [],
      boardName: isSample ? 'Quantum Computing Ideas' : 'New Board',
      activeNodeId: null
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
    userInfo?: { userId: string; username: string; avatarColor: string }
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
      presenceUsers: [],
      otherUsersCursors: {},
      userRole: null,
      currentUserInfo: userInfo || null,
      isLoadingCanvas: true,
      clerkTokenFetcher: getToken
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
                      conversationHistory,
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
    if (!channel || !user) return;

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
        ]
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
        conversationHistory: []
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
        conversationHistory: []
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
        conversationHistory: []
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
        conversationHistory: []
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
        conversationHistory: []
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
