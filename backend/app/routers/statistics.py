
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.crossing import StatisticsResponse
from app.services.crossing_service import get_statistics
router = APIRouter(prefix="/slacklines/{slackline_id}/statistics", tags=["statistics"])
@router.get("", response_model=StatisticsResponse)
async def slackline_statistics(
    slackline_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await get_statistics(db, slackline_id)
