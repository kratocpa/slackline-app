from typing import Optional

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from httpx_oauth.clients.google import GoogleOAuth2
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user_optional
from app.models.user import OAuthAccount, User
from app.schemas.user import UserResponse
router = APIRouter(prefix="/auth", tags=["auth"])
google_oauth = GoogleOAuth2(
    client_id=settings.OAUTH_GOOGLE_CLIENT_ID,
    client_secret=settings.OAUTH_GOOGLE_CLIENT_SECRET,
)
def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
@router.get("/login/google")
async def login_google(request: Request):
    if not settings.OAUTH_GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured. Set OAUTH_GOOGLE_CLIENT_ID and OAUTH_GOOGLE_CLIENT_SECRET in backend/.env",
        )
    callback_url = f"{settings.BACKEND_URL}/api/v1/auth/callback/google"
    authorization_url = await google_oauth.get_authorization_url(
        callback_url,
        scope=["openid", "email", "profile"],
    )
    return RedirectResponse(authorization_url)


@router.get("/callback/google")
async def auth_google_callback(
    request: Request,
    code: str,
    db: AsyncSession = Depends(get_db),
):
    callback_url = f"{settings.BACKEND_URL}/api/v1/auth/callback/google"
    try:
        token = await google_oauth.get_access_token(code, callback_url)
    except Exception:
        raise HTTPException(status_code=400, detail="OAuth failed")
    async with google_oauth.get_httpx_client() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token['access_token']}"},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        user_info = resp.json()
    google_id = user_info["id"]
    email = user_info.get("email", "")
    # Find existing OAuth account
    result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == "google",
            OAuthAccount.provider_user_id == google_id,
        )
    )
    oauth_account = result.scalar_one_or_none()
    if oauth_account:
        # Update token - load user explicitly, never via lazy relationship
        oauth_account.access_token = token["access_token"]
        result = await db.execute(select(User).where(User.id == oauth_account.user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=400, detail="User account not found")
    else:
        # Check if user with this email exists
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            # Auto-create user on first login
            username = email.split("@")[0]
            # Ensure unique username
            base_username = username
            suffix = 1
            while True:
                exists = await db.execute(select(User).where(User.username == username))
                if not exists.scalar_one_or_none():
                    break
                username = f"{base_username}{suffix}"
                suffix += 1
            user = User(
                email=email,
                username=username,
                display_name=user_info.get("name"),
                avatar_url=user_info.get("picture"),
                is_active=True,
                is_admin=False,
            )
            db.add(user)
            await db.flush()
        # Link OAuth account
        oauth_account = OAuthAccount(
            user_id=user.id,
            provider="google",
            provider_user_id=google_id,
            access_token=token["access_token"],
        )
        db.add(oauth_account)
    # Update avatar
    if user_info.get("picture"):
        user.avatar_url = user_info["picture"]
    if user_info.get("name") and not user.display_name:
        user.display_name = user_info["name"]
    await db.flush()
    access_token = create_access_token(str(user.id))
    # Redirect to frontend with cookie
    response = RedirectResponse(url=f"{settings.FRONTEND_URL}/auth/callback/google?success=true")
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=settings.JWT_EXPIRATION_HOURS * 3600,
    )
    return response
@router.get("/me", response_model=Optional[UserResponse])
async def get_me(user: Optional[User] = Depends(get_current_user_optional)):
    if not user:
        return JSONResponse(content=None, status_code=200)
    return user
@router.post("/logout")
async def logout():
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token")
    return response
