CREATE TABLE IF NOT EXISTS public."people" (
    id VARCHAR(36) CONSTRAINT ID_PK PRIMARY KEY,
    apelido VARCHAR(32) unique,
    nome VARCHAR(100) not null,
    nascimento CHAR(10) not null,
    stack VARCHAR(1024),
    BUSCA_TRGM TEXT GENERATED ALWAYS AS (LOWER(nome || apelido || stack)) STORED
);

CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA pg_catalog;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_tgrm ON public.people USING GIST (BUSCA_TRGM GIST_TRGM_OPS(SIGLEN=64));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apelido ON public.people USING btree (apelido);