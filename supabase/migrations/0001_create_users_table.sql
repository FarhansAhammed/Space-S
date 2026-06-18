-- Create users table
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Clerk User ID (e.g., user_2b...)
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow all users to read user records (to show usernames and colors of others in the canvas)
CREATE POLICY "Allow public read access to users" ON users
  FOR SELECT USING (true);

-- Allow users to update only their own user record
CREATE POLICY "Allow users to update their own profile" ON users
  FOR UPDATE USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);
