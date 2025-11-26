ALTER TABLE notification_user 
ADD "user" text;

ALTER TABLE notification_user
DROP COLUMN "attachedTo";

UPDATE notification_user
SET "user" = (data->>'user');

ALTER TABLE notification_user
ALTER COLUMN "user" SET NOT NULL;