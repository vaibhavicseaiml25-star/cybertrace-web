from collections import deque
from typing import List, Dict, Any

def build_adjacency(nodes: List[Dict], edges: List[Dict]) -> Dict[str, List[str]]:
    adj = {n["id"]: [] for n in nodes}
    for e in edges:
        src = e["source"]
        tgt = e["target"]
        if src in adj and tgt not in adj[src]:
            adj[src].append(tgt)
        if tgt in adj and src not in adj[tgt]:
            adj[tgt].append(src)
    return adj

def run_bfs(nodes: List[Dict], edges: List[Dict], start_id: str) -> Dict[str, Any]:
    adj = build_adjacency(nodes, edges)
    if start_id not in adj:
        return {"visited_nodes": [], "traversed_edges": [], "steps": []}

    visited = []
    seen = {start_id}
    queue = deque([start_id])
    traversed_edges = []

    while queue:
        curr = queue.popleft()
        visited.append(curr)
        for neighbor in adj[curr]:
            if neighbor not in seen:
                seen.add(neighbor)
                queue.append(neighbor)
                traversed_edges.append({"source": curr, "target": neighbor})

    return {
        "algorithm": "BFS",
        "visited_nodes": visited,
        "traversed_edges": traversed_edges,
        "path_string": " -> ".join(visited)
    }

def run_dfs(nodes: List[Dict], edges: List[Dict], start_id: str) -> Dict[str, Any]:
    adj = build_adjacency(nodes, edges)
    if start_id not in adj:
        return {"visited_nodes": [], "traversed_edges": [], "steps": []}

    visited = []
    seen = set()
    traversed_edges = []

    def dfs(node: str):
        seen.add(node)
        visited.append(node)
        for neighbor in adj[node]:
            if neighbor not in seen:
                traversed_edges.append({"source": node, "target": neighbor})
                dfs(neighbor)

    dfs(start_id)
    return {
        "algorithm": "DFS",
        "visited_nodes": visited,
        "traversed_edges": traversed_edges,
        "path_string": " -> ".join(visited)
    }

def run_shortest_path(nodes: List[Dict], edges: List[Dict], start_id: str, end_id: str) -> Dict[str, Any]:
    adj = build_adjacency(nodes, edges)
    if start_id not in adj or end_id not in adj:
        return {"visited_nodes": [], "traversed_edges": [], "path_string": "Invalid nodes"}

    queue = deque([[start_id]])
    seen = {start_id}

    while queue:
        path = queue.popleft()
        curr = path[-1]
        if curr == end_id:
            t_edges = [{"source": path[i], "target": path[i + 1]} for i in range(len(path) - 1)]
            return {
                "algorithm": "SHORTEST_PATH",
                "visited_nodes": path,
                "traversed_edges": t_edges,
                "hops": len(path) - 1,
                "path_string": " -> ".join(path)
            }
        for neighbor in adj[curr]:
            if neighbor not in seen:
                seen.add(neighbor)
                queue.append(path + [neighbor])

    return {
        "algorithm": "SHORTEST_PATH",
        "visited_nodes": [],
        "traversed_edges": [],
        "path_string": f"No path found between {start_id} and {end_id}"
    }