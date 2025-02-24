ALTER TABLE notification 
ADD "isViewed" bool,
ADD archived bool,
ADD "user" text;

ALTER TABLE notification
DROP COLUMN "attachedTo";

UPDATE notification
SET "isViewed" = (data->>'isViewed')::boolean;

UPDATE notification
SET "archived" = (data->>'archived')::boolean;

UPDATE notification
SET "user" = (data->>'user');

ALTER TABLE notification
ALTER COLUMN "isViewed" SET NOT NULL;

ALTER TABLE notification
ALTER COLUMN archived SET NOT NULL;

ALTER TABLE notification
ALTER COLUMN "user" SET NOT NULL;