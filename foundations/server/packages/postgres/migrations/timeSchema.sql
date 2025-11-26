ALTER TABLE time 
ADD "workslots" bigint,
ADD "doneOn" bigint,
add rank text,
ADD "user" text;

UPDATE time
SET "workslots" = (data->>'workslots')::bigint;

UPDATE time
SET "doneOn" = (data->>'doneOn')::bigint;

UPDATE time
SET "rank" = (data->>'rank');

UPDATE time
SET "user" = (data->>'user');
