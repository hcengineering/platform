ALTER TABLE event 
ADD "date" bigint,
ADD "dueDate" bigint,
add calendar text,
ADD "participants" text[];

UPDATE event
SET "date" = (data->>'date')::bigint;

UPDATE event
SET "dueDate" = (data->>'dueDate')::bigint;

UPDATE calendar
SET "calendar" = (data->>'calendar');

UPDATE event
SET "participants" = array(
    SELECT jsonb_array_elements_text(data->'participants')
);
