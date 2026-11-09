-- Add 'epic' to the project_item_kind enum
ALTER TYPE public.project_item_kind ADD VALUE IF NOT EXISTS 'epic' BEFORE 'milestone';
