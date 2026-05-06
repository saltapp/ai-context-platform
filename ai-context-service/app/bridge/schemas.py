from pydantic import BaseModel


class IndexStats(BaseModel):
    nodes: int = 0
    edges: int = 0
    communities: int = 0
    processes: int = 0


class RepoInfo(BaseModel):
    name: str
    path: str
    indexed_at: str | None = None
    last_commit: str | None = None
    stats: IndexStats | None = None


class SearchResultItem(BaseModel):
    node_id: str = ""
    name: str
    file_path: str = ""
    score: float = 0.0
    cluster: str | None = None


class SearchResult(BaseModel):
    results: list[SearchResultItem]
    total: int


class RouteConsumer(BaseModel):
    name: str
    file: str = ""


class RouteInfo(BaseModel):
    method: str = ""
    path: str = ""
    handler: str = ""
    handler_file: str = ""
    middleware: list[str] = []
    consumers: list[RouteConsumer] = []


class ImpactNode(BaseModel):
    name: str
    type: str = ""
    file: str = ""
    depth: int = 1


class ImpactProcessStep(BaseModel):
    name: str
    file: str = ""


class ImpactProcess(BaseModel):
    id: str = ""
    label: str = ""
    steps: list[ImpactProcessStep] = []


class ImpactResult(BaseModel):
    target: ImpactNode | None = None
    risk: str = ""
    summary: dict = {}
    upstream: list[dict] = []
    downstream: list[dict] = []
    affected_processes: list[ImpactProcess] = []


class WikiModule(BaseModel):
    name: str
    file: str


class WikiContent(BaseModel):
    name: str
    content: str
    diagram: str | None = None
