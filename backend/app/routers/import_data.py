
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.import_service import import_all

router = APIRouter(prefix="/admin", tags=["admin"])


def _check_secret(x_import_secret: str = Header(..., alias="X-Import-Secret")):
    if x_import_secret != settings.IMPORT_SECRET:
        raise HTTPException(status_code=403, detail="Invalid import secret")


@router.post("/import")
async def import_csv_data(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_check_secret),
):
    result = await import_all(db)
    return result


class MakeAdminRequest(BaseModel):
    email: str


@router.post("/make-admin")
async def make_admin(
    body: MakeAdminRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_check_secret),
):
    """Promote an existing user to admin by email. Protected by X-Import-Secret header."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"No user found with email '{body.email}'. "
                   "Log in with Google first, then call this endpoint.",
        )
    user.is_admin = True
    await db.commit()
    return {
        "message": f"User '{user.username}' ({user.email}) is now an admin.",
        "user_id": str(user.id),
        "is_admin": True,
    }


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_check_secret),
):
    """List all users. Protected by X-Import-Secret header."""
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "username": u.username,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]

