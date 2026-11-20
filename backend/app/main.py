import random
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from .database import engine, Base, get_db, SessionLocal
from .models import Incident, EvidenceNode, EvidenceEdge
from .seed import seed_enterprise_data
from .core.graph_engine import run_bfs, run_dfs, run_shortest_path

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CYBERTRACE Enterprise SOC Engine", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_enterprise_data(db)
    finally:
        db.close()

# --- Schemas ---
class StatusUpdate(BaseModel):
    status: str

class TelemetryPayload(BaseModel):
    host_id: str
    hostname: str
    department: str = "Connected Org"
    ip_address: str = "192.168.1.50"
    cpu_percent: float
    memory_percent: float
    suspicious_process: Optional[str] = None
    outbound_connections: int = 5

class TraversalRequest(BaseModel):
    start_node: str
    end_node: Optional[str] = None
    algorithm: str = "BFS"

# --- Endpoints ---
@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    incidents = db.query(Incident).all()
    nodes = db.query(EvidenceNode).all()
    return {
        "total_incidents": len(incidents),
        "active_incidents": sum(1 for i in incidents if i.status == "Active"),
        "critical_incidents": sum(1 for i in incidents if i.severity == "Critical"),
        "resolved_incidents": sum(1 for i in incidents if i.status == "Resolved"),
        "monitored_assets": len(nodes),
        "compromised_assets": sum(1 for n in nodes if n.status == "Compromised"),
    }

@app.get("/api/incidents")
def list_incidents(db: Session = Depends(get_db)):
    incidents = db.query(Incident).order_by(Incident.updated_at.desc()).all()
    return [
        {
            "id": i.id,
            "title": i.title,
            "subtitle": i.subtitle,
            "severity": i.severity,
            "status": i.status,
            "target_node": i.target_node,
            "department": i.department,
            "attack_vector": i.attack_vector,
            "risk_score": i.risk_score,
            "description": i.description,
            "updated_at": i.updated_at.isoformat() if i.updated_at else None,
        }
        for i in incidents
    ]

@app.patch("/api/incidents/{incident_id}/status")
def update_incident_status(incident_id: str, payload: StatusUpdate, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc.status = payload.status
    inc.updated_at = datetime.utcnow()

    # If resolved, heal the target node status if no other active critical incidents exist
    if payload.status == "Resolved" and inc.target_node:
        node = db.query(EvidenceNode).filter(EvidenceNode.id == inc.target_node).first()
        if node:
            node.status = "Healthy"

    db.commit()
    return {"message": "Updated", "id": inc.id, "status": inc.status}

@app.get("/api/graph")
def get_graph(db: Session = Depends(get_db)):
    nodes = db.query(EvidenceNode).all()
    edges = db.query(EvidenceEdge).all()
    return {
        "nodes": [
            {
                "id": n.id,
                "label": n.label,
                "entity_type": n.entity_type,
                "department": n.department,
                "ip_address": n.ip_address,
                "status": n.status,
                "cpu_load": n.cpu_load,
                "x": n.x,
                "y": n.y,
            }
            for n in nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source": e.source_id,
                "target": e.target_id,
                "label": e.relationship_label,
            }
            for e in edges
        ],
    }

@app.post("/api/graph/traverse")
def traverse_graph(req: TraversalRequest, db: Session = Depends(get_db)):
    g = get_graph(db)
    algo = req.algorithm.upper()
    if algo == "BFS":
        return run_bfs(g["nodes"], g["edges"], req.start_node)
    elif algo == "DFS":
        return run_dfs(g["nodes"], g["edges"], req.start_node)
    elif algo in ("SHORTEST", "SHORTEST_PATH"):
        if not req.end_node:
            raise HTTPException(status_code=400, detail="end_node required for Shortest Path")
        return run_shortest_path(g["nodes"], g["edges"], req.start_node, req.end_node)
    raise HTTPException(status_code=400, detail="Unsupported algorithm")

# --- REAL ORGANIZATION AGENT TELEMETRY INGESTION ---
@app.post("/api/telemetry/ingest")
def ingest_telemetry(payload: TelemetryPayload, db: Session = Depends(get_db)):
    """
    Real workstations/servers send live heartbeat & telemetry here.
    Automatically detects cyberattacks if CPU/connections spike or suspicious processes appear.
    """
    node = db.query(EvidenceNode).filter(EvidenceNode.id == payload.host_id).first()
    if not node:
        node = EvidenceNode(
            id=payload.host_id,
            label=payload.hostname,
            entity_type="Workstation",
            department=payload.department,
            ip_address=payload.ip_address,
            status="Healthy",
            cpu_load=payload.cpu_percent,
            x=random.randint(150, 820),
            y=random.randint(460, 680),
        )
        db.add(node)
        db.add(EvidenceEdge(source_id=payload.host_id, target_id="CORE-FW-02", relationship_label="LIVE_AGENT_LINK"))
        db.add(EvidenceEdge(source_id=payload.host_id, target_id="SIEM-COLLECT-01", relationship_label="REALTIME_STREAM"))

    node.cpu_load = payload.cpu_percent
    node.ip_address = payload.ip_address

    # Autonomous Anomaly Detection Rules
    breach_detected = False
    attack_reason = ""
    if payload.suspicious_process:
        breach_detected = True
        attack_reason = f"Malicious Process Execution ({payload.suspicious_process})"
    elif payload.cpu_percent > 88.0 and payload.outbound_connections > 40:
        breach_detected = True
        attack_reason = f"Cryptomining / DDoS Outbound Flood (CPU {payload.cpu_percent}%, {payload.outbound_connections} conns)"

    new_incident = None
    if breach_detected:
        node.status = "Compromised"
        inc_num = db.query(Incident).count() + 1041
        inc_id = f"INC-{inc_num}"
        new_incident = Incident(
            id=inc_id,
            title=f"LIVE BREACH: {payload.hostname}",
            subtitle=attack_reason,
            severity="Critical",
            status="Active",
            target_node=payload.host_id,
            department=payload.department,
            attack_vector="Autonomous Agent Detection",
            risk_score=98,
            description=f"Real-time EDR agent on {payload.hostname} ({payload.ip_address}) flagged: {attack_reason}.",
            updated_at=datetime.utcnow(),
        )
        db.add(new_incident)
    else:
        node.status = "Warning" if payload.cpu_percent > 75.0 else "Healthy"

    db.commit()
    return {
        "status": "ingested",
        "host_id": payload.host_id,
        "breach_detected": breach_detected,
        "incident_id": new_incident.id if new_incident else None,
        "alert_message": f"CRITICAL CYBERATTACK DETECTED ON {payload.hostname}: {attack_reason}" if breach_detected else None
    }

# --- SIMULATE LIVE ORGANIZATION CYBERATTACK (For SOC Testing & Live Demos) ---
@app.post("/api/telemetry/simulate-attack")
def simulate_org_attack(db: Session = Depends(get_db)):
    scenarios = [
        ("PROD-DB-01", "Production SQL Database", "Production", "SQL Injection & Bulk Exfiltration via 185.220.101.4"),
        ("FIN-PC-04", "Finance Payroll Workstation #04", "Finance", "Ransomware File Encryption Spike (LockBit Variant)"),
        ("AUTH-AD-01", "Active Directory Domain Controller", "Identity", "Golden Ticket Kerberos Forgery Detected"),
        ("ENG-PC-12", "Engineering Workstation #12", "Engineering", "Unauthorized Reverse Shell to 45.133.1.92:4444"),
        ("MAIL-EXCH-01", "Corporate Exchange Server", "Comms", "Zero-Day ProxyShell Remote Code Execution Attempt"),
    ]
    target_id, target_name, dept, vector = random.choice(scenarios)

    node = db.query(EvidenceNode).filter(EvidenceNode.id == target_id).first()
    if node:
        node.status = "Compromised"
        node.cpu_load = round(random.uniform(91.0, 99.4), 1)

    inc_num = db.query(Incident).count() + 1041
    inc_id = f"INC-{inc_num}"
    inc = Incident(
        id=inc_id,
        title=f"INTRUSION ALERT: {target_name}",
        subtitle=vector,
        severity="Critical",
        status="Active",
        target_node=target_id,
        department=dept,
        attack_vector="Autonomous IDS Sensor",
        risk_score=random.randint(93, 99),
        description=f"CYBERTRACE autonomous sensor detected active compromise on {target_name} ({target_id}) in {dept} department. {vector}.",
        updated_at=datetime.utcnow(),
    )
    db.add(inc)
    db.commit()

    return {
        "breach_detected": True,
        "incident": {
            "id": inc.id,
            "title": inc.title,
            "target_node": target_id,
            "department": dept,
            "vector": vector,
        },
        "alert_message": f"Warning! Critical cyberattack detected on {target_name} in {dept} department."
    }