import time
import socket
import platform
import psutil
import requests

CYBERTRACE_API = "http://127.0.0.1:8000/api/telemetry/ingest"
HOSTNAME = platform.node() or "ORG-ENDPOINT-01"
HOST_ID = f"LIVE-{HOSTNAME.upper()[:12]}"

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def scan_suspicious_processes():
    suspicious_keywords = ["mimikatz", "ncat", "netcat", "nmap", "xmrig", "hydra"]
    for proc in psutil.process_iter(["name"]):
        try:
            pname = (proc.info["name"] or "").lower()
            for kw in suspicious_keywords:
                if kw in pname:
                    return pname
        except Exception:
            continue
    return None

if __name__ == "__main__":
    print(f"[CYBERTRACE AGENT] Connected node: {HOSTNAME} ({HOST_ID})")
    print(f"[CYBERTRACE AGENT] Streaming live telemetry to {CYBERTRACE_API}...")
    while True:
        try:
            cpu = psutil.cpu_percent(interval=1)
            mem = psutil.virtual_memory().percent
            conns = len(psutil.net_connections(kind="inet"))
            sus_proc = scan_suspicious_processes()

            payload = {
                "host_id": HOST_ID,
                "hostname": f"{HOSTNAME} (Live Agent)",
                "department": "Connected Org",
                "ip_address": get_local_ip(),
                "cpu_percent": cpu,
                "memory_percent": mem,
                "suspicious_process": sus_proc,
                "outbound_connections": conns,
            }
            res = requests.post(CYBERTRACE_API, json=payload, timeout=5)
            data = res.json()
            print(f"[TELEMETRY] CPU: {cpu}% | RAM: {mem}% | Conns: {conns} | Breach: {data.get('breach_detected')}")
        except Exception as e:
            print(f"[WAITING FOR SERVER] {e}")
        time.sleep(5)