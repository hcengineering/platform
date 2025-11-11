DO $$
DECLARE
    tbl_name text;
    hash_col_not_exists boolean;
    data_col_exists boolean;
BEGIN
    FOR tbl_name IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = %L 
                AND column_name = ''data''
                AND data_type = ''jsonb''
            );', tbl_name) INTO data_col_exists;

        EXECUTE format('
            SELECT NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = %L 
                AND column_name = ''"%%hash%%"'' 
            );', tbl_name) INTO hash_col_not_exists;

        IF data_col_exists AND hash_col_not_exists THEN
            EXECUTE format('
                ALTER TABLE %I ADD COLUMN "%%hash%%" text;', tbl_name);
            EXECUTE format('
                UPDATE %I SET "%%hash%%" = data->>''%%hash%%'';', tbl_name);
        END IF;
    END LOOP;
END $$;