ALTER TABLE doc_index_state 
ADD "needIndex" bool;

ALTER TABLE doc_index_state
DROP COLUMN "attachedTo";

UPDATE doc_index_state
SET "needIndex" = (data->>'needIndex')::boolean;

ALTER TABLE doc_index_state
ALTER COLUMN "needIndex" SET NOT NULL;