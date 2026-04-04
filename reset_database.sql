DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Reset ALL tables that are empty
    FOR r IN (SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_type = 'BASE TABLE') 
    LOOP
        EXECUTE format('DO $inner$ BEGIN 
            IF (SELECT count(*) FROM %I) = 0 THEN 
                BEGIN
                    EXECUTE ''TRUNCATE %I RESTART IDENTITY CASCADE''; 
                    RAISE NOTICE ''Reset sequence for empty table: %%'', %L;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE ''Could not reset sequence for table: %%, error: %%'', %L, SQLERRM;
                END;
            END IF; 
        END $inner$', r.table_name, r.table_name, r.table_name, r.table_name);
    END LOOP;
END $$;
