SQL Setup - 
-- =============================================================================
-- TAGZZS MASTER SCHEMA (FINALIZED)
-- Includes: Auth, Tags, Content, Notes, Storage, Extraction, and Chat
-- =============================================================================

-- =============================================================================
-- 0. CLEANUP (Safe Reset)
-- =============================================================================
-- We use CASCADE to automatically remove related triggers, keys, and views.
-- Order matters: Drop children before parents.

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS extraction_results CASCADE;
DROP TABLE IF EXISTS extraction_queue CASCADE;
DROP TYPE IF EXISTS extraction_status CASCADE;
DROP TABLE IF EXISTS rawcontent CASCADE;
DROP TABLE IF EXISTS personal_notes CASCADE;
DROP TABLE IF EXISTS content_tags CASCADE;
DROP TABLE IF EXISTS content CASCADE;
DROP TABLE IF EXISTS tag_stats CASCADE;
DROP TABLE IF EXISTS tags CASCADE;


DROP VIEW IF EXISTS tags_tree;
DROP FUNCTION IF EXISTS update_tag_stats_trigger CASCADE;
DROP FUNCTION IF EXISTS get_or_create_tag CASCADE;
DROP FUNCTION IF EXISTS normalize_tag_slug CASCADE;
DROP FUNCTION IF EXISTS claim_next_job CASCADE;
DROP FUNCTION IF EXISTS sync_full_content CASCADE;
DROP FUNCTION IF EXISTS update_full_content CASCADE;

-- =============================================================================
-- 1. EXTENSIONS & HELPERS
-- =============================================================================

-- Enable Fuzzy Search (Crucial for Tag suggestions)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Helper: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Helper: Normalize Slug (e.g., '  React JS  ' -> 'react-js')
CREATE OR REPLACE FUNCTION normalize_tag_slug(p_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN REGEXP_REPLACE(LOWER(TRIM(p_name)), '[\s_]+', '-', 'g');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. USER MANAGEMENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    userid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (userid)
);

-- Trigger: Maintain updated_at on users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);


-- RLS: Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = userid);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = userid);

DROP POLICY IF EXISTS "Allow insert during signup" ON users;
CREATE POLICY "Allow insert during signup" ON users FOR INSERT WITH CHECK (auth.uid() = userid);


DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 3. TAGGING SYSTEM TABLES
-- =============================================================================

-- TAGS TABLE
CREATE TABLE tags (
    tagid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    
    parent_id UUID REFERENCES tags(tagid) ON DELETE SET NULL,
    
    tag_name VARCHAR NOT NULL,
    slug VARCHAR NOT NULL,
    color_code VARCHAR(7) DEFAULT '#808080',
    description TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (userid, slug)
);

-- TAG STATS
CREATE TABLE tag_stats (
    userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    tagid UUID NOT NULL,
    
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (userid, tagid),
    FOREIGN KEY (tagid) REFERENCES tags (tagid) ON DELETE CASCADE
);

-- =============================================================================
-- 4. CONTENT TABLES
-- =============================================================================

-- CONTENT METADATA
CREATE TABLE content (
    contentid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    
    content_source VARCHAR,
    content_type VARCHAR,
    title VARCHAR,
    thumbnail_url VARCHAR,
    description TEXT,
    read_time INTEGER,
    link VARCHAR,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONTENT <-> TAGS JUNCTION
CREATE TABLE content_tags (
    contentid UUID NOT NULL,
    tagid UUID NOT NULL,
    userid UUID NOT NULL,
    
    PRIMARY KEY (contentid, tagid),
    FOREIGN KEY (contentid) REFERENCES content (contentid) ON DELETE CASCADE,
    FOREIGN KEY (tagid) REFERENCES tags (tagid) ON DELETE CASCADE
);

-- PERSONAL NOTES
CREATE TABLE personal_notes (
    note_id UUID DEFAULT gen_random_uuid(),
    contentid UUID NOT NULL,
    userid UUID NOT NULL,
    
    note_data JSONB,
    search_vector tsvector,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (contentid, userid),
    FOREIGN KEY (contentid) REFERENCES content (contentid) ON DELETE CASCADE,
    FOREIGN KEY (userid) REFERENCES users (userid) ON DELETE CASCADE
);

CREATE TRIGGER trg_update_notes_timestamp
    BEFORE UPDATE ON personal_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. HEAVY TEXT DATA (RAW EXTRACTIONS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS rawcontent (
    contentid UUID NOT NULL,
    userid UUID NOT NULL,
    rawcontent TEXT, -- The full extracted text
    
    PRIMARY KEY (contentid, userid),
    FOREIGN KEY (contentid) REFERENCES content (contentid) ON DELETE CASCADE
);

-- Index for fast lookup by content
CREATE INDEX IF NOT EXISTS idx_rawcontent_lookup ON rawcontent(contentid, userid);

-- Security: Owner Access Only
ALTER TABLE rawcontent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner Only" ON rawcontent;
CREATE POLICY "Owner Only" ON rawcontent FOR ALL TO authenticated 
USING (auth.uid() = userid) WITH CHECK (auth.uid() = userid);

-- =============================================================================
-- 6. VIEWS & LOGIC TRIGGERS
-- =============================================================================

-- VIEW: Smart Tag Tree
-- FIX: Added 'WITH (security_invoker = true)' to respect RLS policies
CREATE OR REPLACE VIEW tags_tree 
WITH (security_invoker = true)
AS
WITH RECURSIVE tag_hierarchy AS (
    SELECT 
        tagid, userid, tag_name, slug, color_code, parent_id, 
        0 AS level, 
        tag_name::text AS path_string
    FROM tags
    WHERE parent_id IS NULL AND is_deleted = FALSE
    UNION ALL
    SELECT 
        t.tagid, t.userid, t.tag_name, t.slug, t.color_code, t.parent_id, 
        th.level + 1 AS level, 
        th.path_string || ' > ' || t.tag_name
    FROM tags t
    INNER JOIN tag_hierarchy th ON t.parent_id = th.tagid
    WHERE t.is_deleted = FALSE
)
SELECT * FROM tag_hierarchy;

-- TRIGGER: Automatic Tag Stats Update
CREATE OR REPLACE FUNCTION update_tag_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO tag_stats (userid, tagid, usage_count, last_used_at)
        VALUES (NEW.userid, NEW.tagid, 1, NOW())
        ON CONFLICT (userid, tagid) 
        DO UPDATE SET usage_count = tag_stats.usage_count + 1, last_used_at = NOW();
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE tag_stats
        SET usage_count = GREATEST(0, usage_count - 1)
        WHERE tagid = OLD.tagid AND userid = OLD.userid;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintain_tag_stats
AFTER INSERT OR DELETE ON content_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_stats_trigger();

-- FUNCTION: Get or Create Tag
CREATE OR REPLACE FUNCTION get_or_create_tag(
    p_tag_name TEXT,
    p_userid UUID,
    p_color_code VARCHAR(7) DEFAULT '#808080', 
    p_parent_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_slug TEXT;
    v_tagid UUID;
BEGIN
    v_slug := normalize_tag_slug(p_tag_name);
    
    SELECT tagid INTO v_tagid FROM tags WHERE slug = v_slug AND userid = p_userid;

    IF v_tagid IS NULL THEN
        INSERT INTO tags (userid, tag_name, slug, color_code, parent_id)
        VALUES (p_userid, TRIM(p_tag_name), v_slug, p_color_code, p_parent_id)
        RETURNING tagid INTO v_tagid;
        
        INSERT INTO tag_stats (userid, tagid, usage_count)
        VALUES (p_userid, v_tagid, 0);
    END IF;
    RETURN v_tagid;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. INDEXES & PERFORMANCE
-- =============================================================================

CREATE INDEX idx_tags_parent ON tags(parent_id);
CREATE INDEX idx_tags_slug ON tags(userid, slug);
CREATE INDEX idx_tags_name_fuzzy ON tags USING GIST (tag_name gist_trgm_ops);
CREATE INDEX idx_tag_stats_usage ON tag_stats(userid, usage_count DESC);
CREATE INDEX idx_notes_search ON personal_notes USING GIN(search_vector);

-- =============================================================================
-- 8. SECURITY (RLS FOR CORE DATA)
-- =============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN ('tags', 'tag_stats', 'content', 'content_tags', 'personal_notes')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Owner Only" ON %I', t);
        EXECUTE format('CREATE POLICY "Owner Only" ON %I FOR ALL TO authenticated 
                        USING (auth.uid() = userid) WITH CHECK (auth.uid() = userid)', t);
    END LOOP;
END $$;


-- =============================================================================
-- 9. MASTER RPCs: SYNC & UPDATE
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_full_content(
    p_contentid UUID,
    p_userid UUID,
    p_title TEXT,
    p_content_link TEXT,
    p_description TEXT,
    p_thumbnail_url TEXT,
    p_content_type TEXT,
    p_content_source TEXT,
    p_read_time INTEGER,
    p_raw_content TEXT,
    p_note_data JSONB,
    p_tag_map JSONB,
    p_embedding_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_tag_name TEXT;
    v_tag_color TEXT;
    v_tagid UUID;
BEGIN
    -- 1. Metadata
    INSERT INTO public.content (
        contentid, userid, title, description, 
        thumbnail_url, content_type, content_source, 
        read_time, updated_at, link
    )
    VALUES (
        p_contentid, p_userid, p_title, p_description, 
        p_thumbnail_url, p_content_type, p_content_source, 
        p_read_time, NOW(), p_content_link
    )
    ON CONFLICT (contentid) 
    DO UPDATE SET 
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        thumbnail_url = EXCLUDED.thumbnail_url,
        content_type = EXCLUDED.content_type,
        content_source = EXCLUDED.content_source,
        read_time = EXCLUDED.read_time,
        updated_at = NOW();

    -- 2. Raw Content
    INSERT INTO public.rawcontent (contentid, userid, rawcontent)
    VALUES (p_contentid, p_userid, p_raw_content)
    ON CONFLICT (contentid, userid) 
    DO UPDATE SET rawcontent = EXCLUDED.rawcontent;

    -- 3. Notes
    INSERT INTO public.personal_notes (contentid, userid, note_data, updated_at)
    VALUES (p_contentid, p_userid, p_note_data, NOW())
    ON CONFLICT (contentid, userid) 
    DO UPDATE SET note_data = EXCLUDED.note_data, updated_at = NOW();

    -- 4. Tags
    DELETE FROM public.content_tags WHERE contentid = p_contentid AND userid = p_userid;
    
    IF p_tag_map IS NOT NULL AND p_tag_map != '{}'::jsonb THEN
        FOR v_tag_name, v_tag_color IN SELECT * FROM jsonb_each_text(p_tag_map) LOOP
            v_tagid := get_or_create_tag(v_tag_name, p_userid, v_tag_color);
            INSERT INTO public.content_tags (contentid, tagid, userid)
            VALUES (p_contentid, v_tagid, p_userid)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- 5. Embeddings Metadata
    IF p_embedding_metadata IS NOT NULL THEN
        INSERT INTO public.content_embeddings (
            contentid, userid, chroma_doc_ids, summary_doc_id, chunk_count, updated_at
        )
        VALUES (
            p_contentid, 
            p_userid, 
            ARRAY(SELECT jsonb_array_elements_text(p_embedding_metadata->'chromaDocIds')),
            p_embedding_metadata->>'summaryDocId',
            (p_embedding_metadata->>'chunkCount')::INTEGER,
            NOW()
        )
        ON CONFLICT (contentid, userid) 
        DO UPDATE SET 
            chroma_doc_ids = EXCLUDED.chroma_doc_ids,
            summary_doc_id = EXCLUDED.summary_doc_id,
            chunk_count = EXCLUDED.chunk_count,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION update_full_content(
    p_contentid UUID,
    p_userid UUID,
    p_updates JSONB,
    p_raw_content TEXT DEFAULT NULL,
    p_note_text TEXT DEFAULT NULL,
    p_tag_map JSONB DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_tag_name TEXT;
    v_tag_color TEXT;
    v_tagid UUID;
BEGIN
    UPDATE public.content
    SET 
        title = COALESCE((p_updates->>'title'), title),
        description = COALESCE((p_updates->>'description'), description),
        link = COALESCE((p_updates->>'link'), link),
        content_type = COALESCE((p_updates->>'contentType'), content_type),
        content_source = COALESCE((p_updates->>'contentSource'), content_source),
        read_time = COALESCE((p_updates->>'readTime')::INTEGER, read_time),
        updated_at = NOW()
    WHERE contentid = p_contentid AND userid = p_userid;

    IF p_raw_content IS NOT NULL THEN
        INSERT INTO public.rawcontent (contentid, userid, rawcontent)
        VALUES (p_contentid, p_userid, p_raw_content)
        ON CONFLICT (contentid, userid) 
        DO UPDATE SET rawcontent = EXCLUDED.rawcontent;
    END IF;

    IF p_note_text IS NOT NULL THEN
        INSERT INTO public.personal_notes (contentid, userid, note_data, updated_at)
        VALUES (p_contentid, p_userid, jsonb_build_object('text', p_note_text), NOW())
        ON CONFLICT (contentid, userid) 
        DO UPDATE SET note_data = EXCLUDED.note_data, updated_at = NOW();
    END IF;

    IF p_tag_map IS NOT NULL THEN
        DELETE FROM public.content_tags WHERE contentid = p_contentid AND userid = p_userid;
        FOR v_tag_name, v_tag_color IN SELECT * FROM jsonb_each_text(p_tag_map) LOOP
            v_tagid := get_or_create_tag(v_tag_name, p_userid, v_tag_color);
            INSERT INTO public.content_tags (contentid, tagid, userid)
            VALUES (p_contentid, v_tagid, p_userid)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Sync Note Search Vector
CREATE OR REPLACE FUNCTION personal_notes_search_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.note_data ? 'text' THEN
        NEW.search_vector = to_tsvector('english', COALESCE(NEW.note_data->>'text', ''));
    ELSE
        NEW.search_vector = to_tsvector('english', NEW.note_data::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_notes_search
    BEFORE INSERT OR UPDATE ON personal_notes
    FOR EACH ROW
    EXECUTE FUNCTION personal_notes_search_sync();


-- =============================================================================
-- 10. STORAGE POLICIES
-- =============================================================================

-- 8.1 AVATARS
DROP POLICY IF EXISTS "Allow insert for user avatars" ON storage.objects;
CREATE POLICY "Allow insert for user avatars" ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'user_avatars' AND (storage.foldername(name))[1] = auth.uid()::text );

DROP POLICY IF EXISTS "Allow update for user avatars" ON storage.objects;
CREATE POLICY "Allow update for user avatars" ON storage.objects FOR UPDATE TO authenticated
USING ( bucket_id = 'user_avatars' AND (storage.foldername(name))[1] = auth.uid()::text );

DROP POLICY IF EXISTS "Allow delete for user avatars" ON storage.objects;
CREATE POLICY "Allow delete for user avatars" ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'user_avatars' AND (storage.foldername(name))[1] = auth.uid()::text );

DROP POLICY IF EXISTS "Allow select for user avatars" ON storage.objects;
CREATE POLICY "Allow select for user avatars" ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id = 'user_avatars' AND (storage.foldername(name))[1] = auth.uid()::text );

-- 8.2 UPLOADS
DROP POLICY IF EXISTS "Allow uploads on user-uploads" ON storage.objects;
CREATE POLICY "Allow uploads on user-uploads" ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'user_uploads' AND (storage.foldername(name))[1] = auth.uid()::text );

DROP POLICY IF EXISTS "Allow downloads on user-uploads" ON storage.objects;
CREATE POLICY "Allow downloads on user-uploads" ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id = 'user_uploads' AND (storage.foldername(name))[1] = auth.uid()::text );

DROP POLICY IF EXISTS "Allow updates on user-uploads" ON storage.objects;
CREATE POLICY "Allow updates on user-uploads" ON storage.objects FOR UPDATE TO authenticated
USING ( bucket_id = 'user_uploads' AND (storage.foldername(name))[1] = auth.uid()::text );

DROP POLICY IF EXISTS "Allow deletes on user-uploads" ON storage.objects;
CREATE POLICY "Allow deletes on user-uploads" ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'user_uploads' AND (storage.foldername(name))[1] = auth.uid()::text );

-- 8.3 THUMBNAILS
DROP POLICY IF EXISTS "Allow uploads on user_thumbnails" ON storage.objects;
CREATE POLICY "Allow uploads on user_thumbnails" ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'user_thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text );

DROP POLICY IF EXISTS "Allow downloads on user_thumbnails" ON storage.objects;
CREATE POLICY "Allow downloads on user_thumbnails" ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id = 'user_thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text );

DROP POLICY IF EXISTS "Allow updates on user_thumbnails" ON storage.objects;
CREATE POLICY "Allow updates on user_thumbnails" ON storage.objects FOR UPDATE TO authenticated
USING ( bucket_id = 'user_thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text );

DROP POLICY IF EXISTS "Allow deletes on user_thumbnails" ON storage.objects;
CREATE POLICY "Allow deletes on user_thumbnails" ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'user_thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text );


-- =============================================================================
-- 11. YOUTUBE EXTRACTION TABLES & WORKER LOGIC
-- =============================================================================

CREATE TYPE extraction_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE extraction_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    status extraction_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Results Table
CREATE TABLE extraction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES extraction_queue(id) ON DELETE CASCADE,
    data JSONB, 
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE extraction_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;

-- RLS: Queue
CREATE POLICY "Users can insert their own extraction requests" 
ON extraction_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own extraction requests" 
ON extraction_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- RLS: Results
CREATE POLICY "Users can view their own extraction results" 
ON extraction_results FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM extraction_queue 
        WHERE extraction_queue.id = extraction_results.queue_id 
        AND extraction_queue.user_id = auth.uid()
    )
);

CREATE INDEX idx_extraction_queue_status_created ON extraction_queue(status, created_at);

-- WORKER FUNCTION
CREATE OR REPLACE FUNCTION claim_next_job()
RETURNS SETOF extraction_queue
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
  next_job_id UUID;
BEGIN
  SELECT id INTO next_job_id
  FROM extraction_queue
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF next_job_id IS NOT NULL THEN
    RETURN QUERY
    UPDATE extraction_queue
    SET status = 'processing'
    WHERE id = next_job_id
    RETURNING *;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_next_job() TO service_role;
GRANT EXECUTE ON FUNCTION claim_next_job() TO authenticated;


-- =============================================================================
-- 12. CONVERSATIONS & CHAT (Added)
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    conv_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    title VARCHAR,
    message_count INTEGER DEFAULT 0,
    rating BOOLEAN,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    msg_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conv_id UUID NOT NULL REFERENCES conversations(conv_id) ON DELETE CASCADE,
    userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    role VARCHAR CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers
DROP TRIGGER IF EXISTS update_conversations_timestamp ON conversations;
CREATE TRIGGER update_conversations_timestamp
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_conv_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET message_count = message_count + 1, updated_at = NOW()
    WHERE conv_id = NEW.conv_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_msg_count ON messages;
CREATE TRIGGER trg_increment_msg_count
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conv_message_count();

-- Chat Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT TO authenticated USING (auth.uid() = userid);
CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = userid);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE TO authenticated USING (auth.uid() = userid);
CREATE POLICY "Users can delete own conversations" ON conversations FOR DELETE TO authenticated USING (auth.uid() = userid);

CREATE POLICY "Users can view own messages" ON messages FOR SELECT TO authenticated USING (auth.uid() = userid);
CREATE POLICY "Users can insert own messages" ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = userid);

CREATE INDEX idx_conversations_user_updated ON conversations(userid, updated_at DESC);
CREATE INDEX idx_messages_conv_created ON messages(conv_id, created_at ASC);

-- =============================================================================
-- 13. USER CONTENT STATISTICS
-- =============================================================================

-- 1. The Simple Stats Table
CREATE TABLE IF NOT EXISTS user_content_stats (
    userid UUID PRIMARY KEY REFERENCES users(userid) ON DELETE CASCADE,
    total_content_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Security (RLS)
ALTER TABLE user_content_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner Only" ON user_content_stats;
CREATE POLICY "Owner Only" ON user_content_stats 
FOR ALL TO authenticated USING (auth.uid() = userid);

-- 3. The Automation Trigger Logic
CREATE OR REPLACE FUNCTION update_user_content_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Upsert: Create row if missing, otherwise increment
        INSERT INTO user_content_stats (userid, total_content_count, last_activity_at)
        VALUES (NEW.userid, 1, NOW())
        ON CONFLICT (userid) 
        DO UPDATE SET 
            total_content_count = user_content_stats.total_content_count + 1,
            last_activity_at = NOW();
        RETURN NEW;
    
    ELSIF (TG_OP = 'DELETE') THEN
        -- Decrement
        UPDATE user_content_stats
        SET total_content_count = GREATEST(0, total_content_count - 1)
        WHERE userid = OLD.userid;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger to Content Table
DROP TRIGGER IF EXISTS trg_maintain_content_count ON content;
CREATE TRIGGER trg_maintain_content_count
AFTER INSERT OR DELETE ON content
FOR EACH ROW
EXECUTE FUNCTION update_user_content_count();


-- Storing content embeddings metadata
CREATE TABLE IF NOT EXISTS content_embeddings (
    contentid UUID NOT NULL REFERENCES content(contentid) ON DELETE CASCADE,
    userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    
    chroma_doc_ids TEXT[], 
    summary_doc_id TEXT, 
    chunk_count INTEGER DEFAULT 0,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (contentid, userid)
);

-- Security
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner Only" ON content_embeddings 
FOR ALL TO authenticated 
USING (auth.uid() = userid) WITH CHECK (auth.uid() = userid);


-- CREDIT MANAGEMENT

DROP TYPE IF EXISTS credit_feature CASCADE;
CREATE TYPE credit_feature AS ENUM (
    'capture',
    'graph',
    'database',
    'kai_ai',
    'youtube_extract',
    'topup',
    'promo_code',
    'daily_reward'
);

ALTER TABLE users
ADD COLUMN 
credits_balance INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_credits_balance ON users(credits_balance);

CREATE TABLE credit_ledger (
    creditid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userid UUID NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    feature credit_feature NOT NULL,
    request_id UUID NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_ledger_owner
ON credit_ledger
FOR SELECT
TO authenticated
USING (auth.uid() = userid);

CREATE POLICY credit_ledger_insert
ON credit_ledger
FOR INSERT
TO service_role
WITH CHECK (userid IS NOT NULL AND delta < 0);

GRANT INSERT ON credit_ledger TO service_role;
GRANT SELECT ON credit_ledger TO authenticated;

CREATE UNIQUE INDEX uq_credit_ledger_request ON credit_ledger(userid, request_id);
CREATE INDEX idx_credit_ledger_user_time ON credit_ledger(userid, created_at DESC);

CREATE TABLE credit_pricing (
    feature credit_feature PRIMARY KEY,
    cost INTEGER NOT NULL CHECK (cost > 0)
);
ALTER TABLE credit_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view pricing"
ON credit_pricing;
CREATE POLICY "Authenticated users can view pricing" 
ON credit_pricing FOR SELECT 
TO authenticated 
USING (true);

INSERT INTO credit_pricing (feature, cost) VALUES
('capture', 5),
('kai_ai', 1),
('youtube_extract', 10)
ON CONFLICT (feature) DO UPDATE
SET cost = EXCLUDED.cost;


CREATE OR REPLACE FUNCTION update_user_credits(
    p_userid UUID,
    p_feature credit_feature,
    p_request_id UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
    v_cost INTEGER;
    v_current_balance INTEGER;
BEGIN
    SELECT cost INTO v_cost
    FROM credit_pricing
    WHERE feature = p_feature;

    IF v_cost IS NULL THEN
        RAISE EXCEPTION 'Invalid credit feature';
    END IF;

    SELECT credits_balance INTO v_current_balance
    FROM users
    WHERE userid = p_userid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_current_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;

    UPDATE users
    SET credits_balance = credits_balance - v_cost
    WHERE userid = p_userid;
    
    INSERT INTO credit_ledger (userid, delta, feature, request_id, metadata)
    VALUES (p_userid, -v_cost, p_feature, p_request_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION update_user_credits FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_user_credits TO service_role;

-- AUTOMATION: Create Public Profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (userid, name, email, credits_balance, created_at)
VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email,
    50,
    NOW()
);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE promo_codes (
    code TEXT PRIMARY KEY,
    credit_amount INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE promo_code_usage (
    userid UUID REFERENCES users(userid),
    code TEXT REFERENCES promo_codes(code),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (userid, code)
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view specific promo code" ON promo_codes
    FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Admins have full access to promo_codes" ON promo_codes
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own usage" ON promo_code_usage
    FOR SELECT
    USING (auth.uid() = userid);

CREATE POLICY "Service role only insert usage" ON promo_code_usage
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');


CREATE OR REPLACE FUNCTION apply_promo(
    p_userid UUID,
    p_code TEXT
)
RETURNS VOID AS $$
DECLARE
    v_credit_amount INTEGER;
BEGIN
    SELECT credit_amount INTO v_credit_amount
    FROM promo_codes
    WHERE code = p_code 
      AND is_active = TRUE 
      AND (expires_at IS NULL OR expires_at > NOW());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired promo code';
    END IF;

    -- Ensure if promo code already not used
    IF EXISTS (SELECT 1 FROM promo_code_usage WHERE userid = p_userid AND code = p_code) THEN
        RAISE EXCEPTION 'Promo code already used';
    END IF;

    -- Record the usage
    INSERT INTO promo_code_usage (userid, code) VALUES (p_userid, p_code);

    UPDATE users 
    SET credits_balance = credits_balance + v_credit_amount
    WHERE userid = p_userid;

    -- Log to ledger
    INSERT INTO credit_ledger (userid, delta, feature, request_id, metadata)
    VALUES (
        p_userid, 
        v_credit_amount, 
        'promo_code', 
        gen_random_uuid(),
        sonb_build_object(
            'reason', 'Promo Code',
            'promo_code', p_code
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION distribute_daily_credits()
RETURNS VOID AS $$
BEGIN
    UPDATE public.users
    SET credits_balance = credits_balance + 15;

    INSERT INTO public.credit_ledger (userid, delta, feature, request_id, metadata)
    SELECT 
        userid, 
        15, 
        'daily_reward', 
        gen_random_uuid(), 
        jsonb_build_object('reason', 'Daily Reward', 'time_utc', '00:00')
    FROM public.users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
    'daily-credit-reward',
    '0 0 * * *',
    'SELECT distribute_daily_credits();'
)
