import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Incident, EvidenceNode, EvidenceEdge

def seed_enterprise_data(db: Session):
    if db.query(EvidenceNode).count() > 0:
        return

    # 1. Enterprise Infrastructure Nodes (52 Nodes across Departments)
    nodes_data = [
        # Core Infrastructure & Firewalls
        ("CORE-FW-01", "Perimeter Firewall Alpha", "Firewall", "NetSec", "10.0.0.1", "Healthy", 34.2, 480, 60),
        ("CORE-FW-02", "Internal Segmentation FW", "Firewall", "NetSec", "10.0.0.2", "Healthy", 29.8, 480, 170),
        ("PROD-DB-01", "Primary Customer SQL DB", "Server", "Production", "10.10.1.10", "Warning", 78.4, 240, 150),
        ("PROD-DB-02", "Financial Ledger Replica", "Server", "Finance", "10.10.1.11", "Healthy", 41.0, 240, 260),
        ("AUTH-AD-01", "Active Directory Domain Ctrl", "Server", "Identity", "10.10.2.5", "Compromised", 91.2, 720, 150),
        ("API-GW-01", "Enterprise API Gateway", "Server", "Engineering", "10.10.3.20", "Healthy", 52.1, 720, 260),
        ("BACKUP-NAS-01", "Immutable Vault Storage", "Server", "Storage", "10.10.4.50", "Healthy", 19.5, 480, 310),
        ("MAIL-EXCH-01", "Corporate Exchange Relay", "Server", "Comms", "10.10.5.12", "Healthy", 44.6, 360, 110),
        ("K8S-MASTER-01", "Kubernetes Control Plane", "Server", "CloudOps", "10.10.6.10", "Healthy", 63.0, 600, 110),
        ("SIEM-COLLECT-01", "CYBERTRACE Log Collector", "Server", "SOC", "10.10.9.99", "Healthy", 38.7, 480, 420),
    ]

    # Add 24 Department Workstations
    depts = ["Finance", "HR", "Engineering", "Executive", "Legal", "Sales"]
    for i in range(1, 25):
        dept = depts[i % len(depts)]
        w_id = f"{dept[:3].upper()}-PC-{i:02d}"
        status = "Compromised" if i in (4, 14) else ("Warning" if i in (7, 19) else "Healthy")
        cpu = round(random.uniform(82.0, 97.5), 1) if status == "Compromised" else round(random.uniform(12.0, 58.0), 1)
        x_pos = 90 + ((i - 1) % 8) * 115
        y_pos = 510 + ((i - 1) // 8) * 95
        nodes_data.append((w_id, f"{dept} Workstation #{i:02d}", "Workstation", dept, f"10.20.{i%5}.{10+i}", status, cpu, x_pos, y_pos))

    # Add 10 Employees / Service Accounts
    users = [
        ("USR-CFO-01", "A. Sharma (CFO)", "User", "Executive", "10.20.0.14", "Warning", 0, 120, 380),
        ("USR-ADMIN-01", "R. Verma (Domain Admin)", "User", "Identity", "10.10.2.5", "Compromised", 0, 830, 150),
        ("USR-DEV-09", "K. Nair (Lead DevOps)", "User", "Engineering", "10.20.2.19", "Healthy", 0, 830, 260),
        ("USR-FIN-04", "P. Gupta (Payroll Lead)", "User", "Finance", "10.20.4.14", "Compromised", 0, 120, 260),
        ("USR-HR-02", "S. Iyer (HR Director)", "User", "HR", "10.20.1.12", "Healthy", 0, 350, 380),
        ("SVC-BACKUP", "svc_veeam_backup", "User", "Storage", "10.10.4.50", "Healthy", 0, 610, 380),
    ]
    nodes_data.extend(users)

    # Add 8 Threat Indicators (External Rogue IPs & Malicious Payloads)
    threats = [
        ("IP-185.220.101.4", "185.220.101.4 (Tor Exit)", "IP", "External", "185.220.101.4", "Compromised", 0, 680, 40),
        ("IP-45.133.1.92", "45.133.1.92 (C2 Beacon)", "IP", "External", "45.133.1.92", "Compromised", 0, 280, 40),
        ("IP-91.240.118.172", "91.240.118.172 (Scanner)", "IP", "External", "91.240.118.172", "Warning", 0, 820, 40),
        ("FILE-LOCKBIT.EXE", "invoice_q4_macro.exe", "File", "Payload", "N/A", "Compromised", 0, 110, 150),
        ("FILE-MIMIKATZ", "lsass_dump_tool.ps1", "File", "Payload", "N/A", "Compromised", 0, 850, 360),
    ]
    nodes_data.extend(threats)

    for n in nodes_data:
        db.add(EvidenceNode(
            id=n[0], label=n[1], entity_type=n[2], department=n[3],
            ip_address=n[4], status=n[5], cpu_load=n[6], x=n[7], y=n[8]
        ))

    # 2. Network & Forensic Edges
    edges_data = [
        ("IP-185.220.101.4", "CORE-FW-01", "BRUTE_FORCE"),
        ("IP-45.133.1.92", "CORE-FW-01", "C2_CALLBACK"),
        ("IP-91.240.118.172", "API-GW-01", "PORT_SCAN"),
        ("CORE-FW-01", "CORE-FW-02", "ROUTED_TRAFFIC"),
        ("CORE-FW-02", "PROD-DB-01", "DB_QUERY"),
        ("CORE-FW-02", "PROD-DB-02", "REPLICATION"),
        ("CORE-FW-02", "AUTH-AD-01", "LDAP_AUTH"),
        ("CORE-FW-02", "API-GW-01", "HTTPS_PROXY"),
        ("CORE-FW-02", "BACKUP-NAS-01", "SNAPSHOT_SYNC"),
        ("CORE-FW-02", "MAIL-EXCH-01", "SMTP_RELAY"),
        ("CORE-FW-02", "K8S-MASTER-01", "CLUSTER_API"),
        ("CORE-FW-02", "SIEM-COLLECT-01", "SYSLOG_STREAM"),
        ("AUTH-AD-01", "USR-ADMIN-01", "PRIVILEGED_TOKEN"),
        ("USR-ADMIN-01", "FILE-MIMIKATZ", "EXECUTED_SCRIPT"),
        ("FILE-MIMIKATZ", "API-GW-01", "CREDENTIAL_DUMP"),
        ("FIN-PC-04", "FILE-LOCKBIT.EXE", "DROPPED_PAYLOAD"),
        ("FILE-LOCKBIT.EXE", "PROD-DB-01", "SMB_LATERAL_MOVE"),
        ("USR-FIN-04", "FIN-PC-04", "ACTIVE_SESSION"),
        ("USR-CFO-01", "PROD-DB-02", "LEDGER_ACCESS"),
        ("USR-DEV-09", "K8S-MASTER-01", "SSH_TUNNEL"),
        ("SVC-BACKUP", "BACKUP-NAS-01", "WRITE_ARCHIVE"),
    ]
    # Connect all 24 workstations to Internal Segmentation Firewall & SIEM
    for i in range(1, 25):
        dept = depts[i % len(depts)]
        w_id = f"{dept[:3].upper()}-PC-{i:02d}"
        edges_data.append((w_id, "CORE-FW-02", "LAN_UPLINK"))
        if i % 3 == 0:
            edges_data.append((w_id, "SIEM-COLLECT-01", "TELEMETRY_AGENT"))

    for e in edges_data:
        db.add(EvidenceEdge(source_id=e[0], target_id=e[1], relationship_label=e[2]))

    # 3. Seed 42 Historical + Active Enterprise Incidents
    templates = [
        ("Kerberoasting Ticket Anomaly", "Active Directory", "Critical", "Active", "AUTH-AD-01", "Identity", "Privilege Escalation", 96),
        ("Ransomware Beacon Outbound", "C2 Callback Detected", "Critical", "Active", "FIN-PC-04", "Finance", "Malware C2", 94),
        ("Unauthorized SQL Dump Attempt", "Bulk Table Extraction", "Critical", "Active", "PROD-DB-01", "Production", "Data Exfiltration", 91),
        ("LSASS Memory Credential Read", "PowerShell Injection", "High", "Under Review", "ENG-PC-14", "Engineering", "Credential Access", 85),
        ("Suspicious Tor Exit SSH Login", "Anomalous Geo-IP", "High", "Active", "CORE-FW-01", "NetSec", "Initial Access", 82),
        ("Sudoers File Modification", "Root Escalation", "High", "Under Review", "K8S-MASTER-01", "CloudOps", "Persistence", 79),
        ("Phishing Macro Execution", "Invoice Payload", "Medium", "Resolved", "HR-PC-07", "HR", "Spearphishing", 64),
        ("Port Sweep on Internal VLAN", "Reconnaissance", "Medium", "Resolved", "SAL-PC-19", "Sales", "Discovery", 58),
        ("Expired TLS Certificate Alert", "Gateway Handshake", "Low", "Resolved", "API-GW-01", "Engineering", "Policy Drift", 32),
    ]

    now = datetime.utcnow()
    for idx in range(1, 43):
        tpl = templates[(idx - 1) % len(templates)]
        inc_id = f"INC-{1040 + idx}"
        status = tpl[3] if idx <= 8 else random.choice(["Resolved", "Resolved", "Under Review", "Active"])
        severity = tpl[2] if idx <= 8 else random.choice(["Critical", "High", "Medium", "Low"])
        db.add(Incident(
            id=inc_id,
            title=tpl[0],
            subtitle=tpl[1],
            severity=severity,
            status=status,
            target_node=tpl[4],
            department=tpl[5],
            attack_vector=tpl[6],
            risk_score=tpl[7],
            description=f"Automated SOC sensor detected {tpl[0].lower()} targeting {tpl[4]} ({tpl[5]} dept) via {tpl[6]}.",
            updated_at=now - timedelta(minutes=idx * 27)
        ))

    db.commit()