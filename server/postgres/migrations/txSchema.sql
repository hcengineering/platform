ALTER TABLE tx 
ADD "objectSpace" text,
ADD "objectId" text;

UPDATE tx
SET "objectId" = (data->>'objectId');

UPDATE tx
SET "objectSpace" = (data->>'objectSpace');

ALTER TABLE tx
ALTER COLUMN "objectSpace" SET NOT NULL;

ALTER TABLE tx 
ADD "attachedTo" text;

UPDATE tx
SET "attachedTo" = (data->>'attachedTo');