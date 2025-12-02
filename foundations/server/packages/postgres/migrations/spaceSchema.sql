ALTER TABLE space 
ADD "archived" bool;

UPDATE space
SET "archived" = (data->>'archived')::boolean;
