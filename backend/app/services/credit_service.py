import uuid
from typing import Dict, Any, Optional
from postgrest.exceptions import APIError
from app.utils.supabase.supabase_client import supabase

class CreditError(Exception):
    """
    Exception raised when a user has insufficient credits or a credit transaction fails.
    """
    def __init__(self, message="Insufficient credits for this action", required=None, available=None):
        self.message = message
        self.required = required
        self.available = available
        super().__init__(self.message)

class CreditService:
    @staticmethod
    async def deduct(
        user_id: str, 
        feature: str, 
        request_id: str, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Calls the update_user_credits RPC.
        Returns True if successful, False if idempotency prevents double charge.
        """
        try:
            response = supabase.rpc("update_user_credits", {
                "p_userid": user_id,
                "p_feature": feature,
                "p_request_id": request_id,
                "p_metadata": metadata or {}
            }).execute()
            
            return True

        except APIError as e:
            if "Insufficient credits" in e.message:
                raise CreditError("Insufficient credits for this action.")
            
            if "uq_credit_ledger_request" in e.message:
                return False 
            
            raise e