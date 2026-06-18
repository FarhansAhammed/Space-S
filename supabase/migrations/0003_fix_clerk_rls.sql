-- 1. Create Clerk user ID extraction function in public schema
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  );
$$;

-- 2. Update users table policies
DROP POLICY IF EXISTS "Allow users to update their own profile" ON users;
CREATE POLICY "Allow users to update their own profile" ON users
  FOR UPDATE USING (id = public.clerk_user_id())
  WITH CHECK (id = public.clerk_user_id());

-- 3. Update canvas_members table policies
DROP POLICY IF EXISTS "Select canvas members" ON canvas_members;
CREATE POLICY "Select canvas members" ON canvas_members
  FOR SELECT TO authenticated
  USING (public.clerk_user_id() = user_id);

-- 4. Update canvases table policies
DROP POLICY IF EXISTS "Delete canvases" ON canvases;
CREATE POLICY "Delete canvases" ON canvases
  FOR DELETE TO authenticated
  USING (owner_id = public.clerk_user_id());

DROP POLICY IF EXISTS "Select canvases" ON canvases;
CREATE POLICY "Select canvases" ON canvases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = canvases.id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  );

DROP POLICY IF EXISTS "Update canvases" ON canvases;
CREATE POLICY "Update canvases" ON canvases
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = canvases.id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = canvases.id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  );

-- 5. Update nodes table policies
DROP POLICY IF EXISTS "Select nodes" ON nodes;
CREATE POLICY "Select nodes" ON nodes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = nodes.canvas_id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  );

DROP POLICY IF EXISTS "Modify nodes" ON nodes;
CREATE POLICY "Modify nodes" ON nodes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = nodes.canvas_id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = nodes.canvas_id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  );

-- 6. Update edges table policies
DROP POLICY IF EXISTS "Select edges" ON edges;
CREATE POLICY "Select edges" ON edges
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = edges.canvas_id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  );

DROP POLICY IF EXISTS "Modify edges" ON edges;
CREATE POLICY "Modify edges" ON edges
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = edges.canvas_id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = edges.canvas_id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  );

-- 7. Update node_messages table policies
DROP POLICY IF EXISTS "Select node_messages" ON node_messages;
CREATE POLICY "Select node_messages" ON node_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nodes
      JOIN canvas_members ON canvas_members.canvas_id = nodes.canvas_id
      WHERE nodes.id = node_messages.node_id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  );

DROP POLICY IF EXISTS "Modify node_messages" ON node_messages;
CREATE POLICY "Modify node_messages" ON node_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nodes
      JOIN canvas_members ON canvas_members.canvas_id = nodes.canvas_id
      WHERE nodes.id = node_messages.node_id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nodes
      JOIN canvas_members ON canvas_members.canvas_id = nodes.canvas_id
      WHERE nodes.id = node_messages.node_id
      AND canvas_members.user_id = public.clerk_user_id()
    )
  );

-- 8. Add sender_id to node_messages
ALTER TABLE node_messages ADD COLUMN sender_id TEXT REFERENCES users(id) ON DELETE SET NULL;

