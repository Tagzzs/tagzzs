import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# Firebase Admin config replication
private_key = os.getenv("FIREBASE_PRIVATE_KEY")
if private_key:
    private_key = private_key.replace("\\n", "\n")

firebase_admin_config = {
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "private_key": private_key,
}

# Initialize Firebase Admin
# Check if the default app exists to prevent re-initialization
try:
    app = firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate(firebase_admin_config)
    app = firebase_admin.initialize_app(cred, {
        'projectId': os.getenv("FIREBASE_PROJECT_ID"),
    })

# Initialize Firestore Admin
admin_db = firestore.client()