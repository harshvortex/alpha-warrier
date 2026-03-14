from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader
from typing import List, Optional

API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# Mock user database
USERS_DB = {
    "admin_key": {"username": "admin", "role": "admin"},
    "user_key": {"username": "user", "role": "user"},
    "trainee_key": {"username": "trainee", "role": "trainee"}, # Delegated Role
    "guard_key": {"username": "guard", "role": "security"},
}

def get_current_user(api_key: str = Depends(api_key_header)):
    if not api_key or api_key not in USERS_DB:
        raise HTTPException(status_code=401, detail="Invalid or missing API Key")
    return USERS_DB[api_key]

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: dict = Depends(get_current_user)):
        if user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=403, detail="Operation not permitted for this role"
            )
        return user
