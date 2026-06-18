-- Migration: Add sort_order column to rounds for manual drag-and-drop reordering

alter table rounds add column sort_order integer default null;

-- Create an index for efficient sorting
create index idx_rounds_sort_order on rounds(group_id, sort_order nulls last, created_at);

-- Add a comment explaining the column
comment on column rounds.sort_order is 'Manual sort order for drag-and-drop reordering. NULL means use created_at. Populated when admin reorders matches.';
