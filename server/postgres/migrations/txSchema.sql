ALTER TABLE tx 
ADD "objectSpace" text,
ADD "objectId" text;

ALTER TABLE tx
DROP COLUMN "attachedTo";

UPDATE tx
SET "objectId" = (data->>'objectId');

UPDATE tx
SET "objectSpace" = (data->>'objectSpace');

ALTER TABLE tx
ALTER COLUMN "objectSpace" SET NOT NULL;