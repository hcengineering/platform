ALTER TABLE calendar 
ADD "hidden" bool;

UPDATE calendar
SET "hidden" = (data->>'hidden')::boolean;
