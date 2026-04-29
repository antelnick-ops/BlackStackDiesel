-- Allow 'freight_quote' as a valid feedback.type value.
-- Quote requests for items >1000 lbs are stored as feedback rows
-- with type='freight_quote' and priority='critical'.

ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_type_check;

ALTER TABLE feedback ADD CONSTRAINT feedback_type_check
  CHECK (type = ANY (ARRAY[
    'bug'::text,
    'feature'::text,
    'wrong_fitment'::text,
    'image_issue'::text,
    'wrong_description'::text,
    'freight_quote'::text,
    'other'::text
  ]));

-- Verify
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'feedback'::regclass
  AND conname = 'feedback_type_check';
