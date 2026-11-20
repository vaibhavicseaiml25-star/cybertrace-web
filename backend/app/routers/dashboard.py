from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident
from app.schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)) -> DashboardStats:
    incidents = db.query(Incident).all()
    return DashboardStats(
        total=len(incidents),
        active=sum(1 for item in incidents if item.status == "Active"),
        critical=sum(1 for item in incidents if item.severity == "Critical"),
        under_review=sum(1 for item in incidents if item.status == "Under Review"),
        resolved=sum(1 for item in incidents if item.status == "Resolved"),
    )
