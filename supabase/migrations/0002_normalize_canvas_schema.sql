-- Create canvases table
CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Canvas',
  viewport JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  invite_token TEXT UNIQUE,
  invite_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create canvas_members table
CREATE TABLE canvas_members (
  canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (canvas_id, user_id)
);

-- Create nodes table
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('llm', 'branch', 'merge', 'image', 'doc')),
  position_x FLOAT NOT NULL DEFAULT 0.0,
  position_y FLOAT NOT NULL DEFAULT 0.0,
  width FLOAT,
  height FLOAT,
  title TEXT NOT NULL DEFAULT 'Node',
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  source_file TEXT,
  parent_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  is_collapsed BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create edges table
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create node_messages table
CREATE TABLE node_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_messages ENABLE ROW LEVEL SECURITY;

-- canvas_members RLS: members can select rows they are linked to
CREATE POLICY "Select canvas members" ON canvas_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members AS cm
      WHERE cm.canvas_id = canvas_members.canvas_id
      AND cm.user_id = auth.uid()::text
    )
  );

-- canvases RLS: read/write only if user is in canvas_members
CREATE POLICY "Select canvases" ON canvases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = canvases.id
      AND canvas_members.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Update canvases" ON canvases
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = canvases.id
      AND canvas_members.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = canvases.id
      AND canvas_members.user_id = auth.uid()::text
    )
  );

-- nodes RLS: select/all operations only if user is in canvas_members
CREATE POLICY "Select nodes" ON nodes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = nodes.canvas_id
      AND canvas_members.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Modify nodes" ON nodes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = nodes.canvas_id
      AND canvas_members.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = nodes.canvas_id
      AND canvas_members.user_id = auth.uid()::text
    )
  );

-- edges RLS: select/all operations only if user is in canvas_members
CREATE POLICY "Select edges" ON edges
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = edges.canvas_id
      AND canvas_members.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Modify edges" ON edges
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = edges.canvas_id
      AND canvas_members.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = edges.canvas_id
      AND canvas_members.user_id = auth.uid()::text
    )
  );

-- node_messages RLS: select/all operations only if user is in canvas_members
CREATE POLICY "Select node_messages" ON node_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nodes
      JOIN canvas_members ON canvas_members.canvas_id = nodes.canvas_id
      WHERE nodes.id = node_messages.node_id
      AND canvas_members.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Modify node_messages" ON node_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nodes
      JOIN canvas_members ON canvas_members.canvas_id = nodes.canvas_id
      WHERE nodes.id = node_messages.node_id
      AND canvas_members.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nodes
      JOIN canvas_members ON canvas_members.canvas_id = nodes.canvas_id
      WHERE nodes.id = node_messages.node_id
      AND canvas_members.user_id = auth.uid()::text
    )
  );

-- Add tables to the Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE canvases, nodes, edges;
