import os
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
jwt_secret: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")


def get_supabase() -> Client:
    return create_client(url, key)


def get_supabase_admin() -> Client:
    """
    Returns a Supabase client with the service role key.
    Use this CAREFULLY for admin operations that bypass RLS.
    """
    if not jwt_secret:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is not set")
    return create_client(url, jwt_secret)
