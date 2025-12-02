ALTER TABLE notification_dnc 
ADD "objectId" text,
ADD "objectClass" text,
ADD "user" text;

ALTER TABLE notification_dnc
DROP COLUMN "attachedTo";

UPDATE notification_dnc
SET "objectId" = (data->>'objectId');

UPDATE notification_dnc
SET "objectClass" = (data->>'objectClass');

UPDATE notification_dnc
SET "user" = (data->>'user');

ALTER TABLE notification_dnc
ALTER COLUMN "objectId" SET NOT NULL;

ALTER TABLE notification_dnc
ALTER COLUMN "objectClass" SET NOT NULL;

ALTER TABLE notification_dnc
ALTER COLUMN "user" SET NOT NULL;