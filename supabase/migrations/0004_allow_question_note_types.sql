-- Drop the existing check constraint on nodes type
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_type_check;

-- Re-add the check constraint allowing 'question' and 'note' types
ALTER TABLE nodes ADD CONSTRAINT nodes_type_check CHECK (type IN ('llm', 'branch', 'merge', 'image', 'doc', 'question', 'note'));
