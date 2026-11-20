from sqlalchemy import Column, String, Integer, Float, DateTime, Text
from datetime import datetime
from .database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subtitle = Column(String, nullable=True)
    severity = Column(String, default="Medium")  # Critical, High, Medium, Low
    status = Column(String, default="Active")      # Active, Under Review, Resolved
    target_node = Column(String, nullable=True)
    department = Column(String, default="Core Infrastructure")
    attack_vector = Column(String, default="Anomalous Telemetry")
    risk_score = Column(Integer, default=75)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

class EvidenceNode(Base):
    __tablename__ = "evidence_nodes"

    id = Column(String, primary_key=True, index=True)
    label = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)  # Server, Workstation, Firewall, User, IP, File, Incident
    department = Column(String, default="IT Ops")
    ip_address = Column(String, nullable=True)
    status = Column(String, default="Healthy")    # Healthy, Warning, Compromised
    cpu_load = Column(Float, default=18.5)
    x = Column(Float, default=200.0)
    y = Column(Float, default=200.0)

class EvidenceEdge(Base):
    __tablename__ = "evidence_edges"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_id = Column(String, nullable=False)
    target_id = Column(String, nullable=False)
    relationship_label = Column(String, default="CONNECTED_TO")