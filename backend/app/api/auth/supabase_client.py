import os
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
jwt_secret: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")


def get_supabase() -> Client:
    return create_client(url, key)
