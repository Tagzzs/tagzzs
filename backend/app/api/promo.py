# app/api/promo.py
import traceback
from typing import Dict, Any
from fastapi import APIRouter, Request, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Internal imports
from app.api.dependencies import get_current_user
from app.utils.supabase.auth import create_auth_error
from app.utils.supabase.supabase_client import supabase

# Define the schema for incoming promo requests
class PromoSchema(BaseModel):
    promo_code: str = Field(..., min_length=1, description="The promo code to apply")

router = APIRouter(prefix="/api/promo", tags=["Promo Code"])

@router.post('/apply')
async def apply_promo(
    req: Request,
    user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        if not user:
            return create_auth_error("Authentication required to apply promo code")

        try:
            body_json = await req.json()
            data = PromoSchema(**body_json)
        except Exception:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False, 
                    "error": {"code": "INVALID_INPUT", "message": "Valid promo_code is required"}
                }
            )

        try:
            response = supabase.rpc("apply_promo", {
                "p_userid": user["id"],
                "p_code": data.promo_code
            }).execute()
            
            return {
                "success": True,
                "message": f"Promo code '{data.promo_code}' applied successfully!"
            }

        except Exception as promo_error:
            error_msg = str(promo_error)
            
            if "already used" in error_msg:
                status_code = 409
                code = "PROMO_ALREADY_USED"
                message = "You have already used this promo code."
            elif "expired" in error_msg or "Invalid" in error_msg:
                status_code = 400
                code = "PROMO_INVALID"
                message = "This promo code is invalid or has expired."
            else:
                status_code = 500
                code = "PROMO_ERROR"
                message = "Failed to apply promo code."

            return JSONResponse(
                status_code=status_code,
                content={
                    "success": False,
                    "error": {
                        "code": code, 
                        "message": message, 
                        "details": error_msg
                    }
                }
            )
    
    except Exception:
        traceback.print_exc()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False, 
                "error": {
                    "code": "SERVER_ERROR", 
                    "message": "Internal server error"
                }
            }
        )