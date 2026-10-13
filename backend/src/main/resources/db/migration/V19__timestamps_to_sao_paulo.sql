-- =============================================
-- DanJu - Migration V19: Horarios em America/Sao_Paulo
-- A JVM rodava em UTC no servidor, entao todo LocalDateTime foi gravado
-- em UTC. A partir de agora a aplicacao roda no horario de Brasilia
-- (StoreProApplication), e os horarios ja gravados sao convertidos
-- para o mesmo fuso, para "hoje", "mes" e os graficos por dia baterem.
-- =============================================

DO $$
DECLARE
    col RECORD;
BEGIN
    FOR col IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type = 'timestamp without time zone'
          AND table_name <> 'flyway_schema_history'
    LOOP
        EXECUTE format(
            'UPDATE %I SET %I = (%I AT TIME ZONE ''UTC'') AT TIME ZONE ''America/Sao_Paulo'' WHERE %I IS NOT NULL',
            col.table_name, col.column_name, col.column_name, col.column_name);
    END LOOP;
END $$;
