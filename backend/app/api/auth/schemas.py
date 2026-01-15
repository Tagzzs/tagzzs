from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing_extensions import Self
from typing import Optional
import re

"""
Creating schemas for specific type of AuthRequest with validation
"""


class SignUpRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., alias="confirmPassword")
    promo_code: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^[a-zA-Z\s'-]+$", v):
            raise ValueError(
                "Name can only contain letters, spaces, hyphens, and apostrophes"
            )
        return v

    @model_validator(mode="after")
    def check_passwords_match(self) -> Self:
        if self.password != self.confirm_password:
            raise ValueError("Passwords don't match")
        return self


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
