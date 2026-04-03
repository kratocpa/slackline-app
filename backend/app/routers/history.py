
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.history import ChangeHistoryResponse
from app.services.history_service import get_history
router = APIRouter(prefix="/slacklines/{slackline_id}/history", tags=["history"])
@router.get("", response_model=ChangeHistoryResponse)
async def list_history(
    slackline_id: int,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    return await get_history(db, "slackline", slackline_id, page, page_size)
