"""
Configuration module for loading environment variables.
Loads from .env.local first, then falls back to .env if .env.local doesn't exist.
"""

from pathlib import Path
from dotenv import load_dotenv


def load_environment():
    """
    Load environment variables with priority:
    1. .env.local (for local development with sensitive credentials)
    2. .env (fallback for non-sensitive configuration)
    """
    repo_root = Path(__file__).resolve().parents[1]

    for env_file in [".env.local", ".env"]:
        env_path = repo_root / env_file
        print(f"Checking for {env_path}...")
        if env_path.exists():
            print(f"[OK] Loading environment from {env_path}")
            load_dotenv(env_path, override=True)
            return

    print(
        "⚠ No .env or .env.local file found. Using system environment variables only."
    )


load_environment()
