from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class IncidentBase(BaseModel):
    code: str
    title: str
    incident_type: str
    severity: str
    status: str
    description: str = ""


class IncidentRead(IncidentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class IncidentUpdate(BaseModel):
    status: str | None = Field(default=None)
    severity: str | None = Field(default=None)
    title: str | None = Field(default=None)
    description: str | None = Field(default=None)


class DashboardStats(BaseModel):
    total: int
    active: int
    critical: int
    under_review: int
    resolved: int


class EvidenceNodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    label: str
    node_type: str
    details: str
    incident_id: int | None = None


class EvidenceEdgeRead(BaseModel):
    id: int
    source: str
    target: str
    relation: str
    source_id: int
    target_id: int


class GraphPayload(BaseModel):
    nodes: list[EvidenceNodeRead]
    edges: list[EvidenceEdgeRead]


class TraversalRequest(BaseModel):
    algorithm: str = Field(description="bfs, dfs, or shortest_path")
    start: str
    goal: str | None = None
    incident_id: int | None = None


class TraversalResult(BaseModel):
    algorithm: str
    start: str
    goal: str | None = None
    visited_nodes: list[dict]
    visited_edges: list[dict]
    order: list[str]
    path: list[str]
    path_found: bool
    hops: int | None = None
    message: str | None = None
