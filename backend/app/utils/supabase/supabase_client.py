# Global supabase client config

import os
from supabase import create_client, Client

class SupabaseManager:
    _client: Client = None

    @classmethod
    def get_client(cls) -> Client:
        if cls._client is None:
            url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
            key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            cls._client = create_client(url, key)
        return cls._client

# Create a global instance to be imported elsewhere
supabase = SupabaseManager.get_client()