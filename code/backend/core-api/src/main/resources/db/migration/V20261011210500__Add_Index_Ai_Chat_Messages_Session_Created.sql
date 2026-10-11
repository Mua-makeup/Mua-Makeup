-- Migration to add composite index on ai_chat_messages (session_id, created_at ASC) for sub-millisecond chat history queries
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_created 
ON interaction_schema.ai_chat_messages (session_id, created_at ASC);
