from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident
from app.schemas import IncidentRead, IncidentUpdate

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

ALLOWED_STATUSES = {"Active", "Under Review", "Resolved"}
ALLOWED_SEVERITIES = {"Critical", "High", "Medium", "Low"}


@router.get("", response_model=list[IncidentRead])
def list_incidents(db: Session = Depends(get_db)) -> list[Incident]:
    return db.query(Incident).order_by(Incident.code).all()


@router.get("/{incident_id}", response_model=IncidentRead)
def get_incident(incident_id: int, db: Session = Depends(get_db)) -> Incident:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return incident


@router.patch("/{incident_id}", response_model=IncidentRead)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
) -> Incident:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found.")

    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}.",
        )
    if "severity" in updates and updates["severity"] not in ALLOWED_SEVERITIES:
        raise HTTPException(
            status_code=400,
            detail=f"Severity must be one of: {', '.join(sorted(ALLOWED_SEVERITIES))}.",
        )

    for field, value in updates.items():
        setattr(incident, field, value)
    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)
    return incident
