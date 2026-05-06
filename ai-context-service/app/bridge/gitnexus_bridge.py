import asyncio
import json
import logging
import os
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger("ai-context-service.bridge")


class GitNexusBridge:
    def __init__(self):
        self._client = httpx.AsyncClient(
            base_url=settings.GITNEXUS_SERVE_URL,
            timeout=httpx.Timeout(60.0, connect=10.0),
        )
        self._cli_env = {
            **os.environ,
            "GITNEXUS_HOME": settings.GITNEXUS_HOME,
        }
        if settings.OPENAI_API_KEY:
            self._cli_env["OPENAI_API_KEY"] = settings.OPENAI_API_KEY

    async def close(self):
        await self._client.aclose()

    # ── CLI helpers ──

    async def _run_cli(
        self, args: list[str], cwd: str | None = None, timeout: int = 1800
    ) -> tuple[int, str, str]:
        cmd = [settings.GITNEXUS_CLI_PATH] + args
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=cwd,
            env=self._cli_env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            raise RuntimeError(f"CLI command timed out: {' '.join(cmd)}")
        return proc.returncode, stdout.decode(), stderr.decode()

    # ── Git operations ──

    async def clone_or_pull(self, git_url: str, repo_path: str, branch: str = "main") -> None:
        repo_dir = Path(repo_path)
        if repo_dir.exists() and (repo_dir / ".git").exists():
            rc, out, err = await self._run_cli(
                ["git", "pull", "--ff-only"], cwd=repo_path, timeout=300
            )
            if rc != 0:
                raise RuntimeError(f"git pull failed: {err}")
        else:
            repo_dir.parent.mkdir(parents=True, exist_ok=True)
            rc, out, err = await self._run_cli(
                ["git", "clone", "-b", branch, git_url, repo_path], timeout=600
            )
            if rc != 0:
                raise RuntimeError(f"git clone failed: {err}")

    async def get_current_commit(self, repo_path: str) -> str:
        rc, out, _ = await self._run_cli(
            ["git", "rev-parse", "HEAD"], cwd=repo_path, timeout=30
        )
        if rc != 0:
            raise RuntimeError("Failed to get current commit")
        return out.strip()[:40]

    # ── GitNexus CLI: analyze ──

    async def analyze(self, repo_path: str, force: bool = False) -> None:
        args = ["analyze", repo_path]
        if force:
            args.append("--force")
        rc, out, err = await self._run_cli(args, timeout=1800)
        if rc != 0:
            raise RuntimeError(f"gitnexus analyze failed: {err}")
        logger.info(f"Analyze completed for {repo_path}")

    # ── GitNexus CLI: wiki ──

    async def generate_wiki(self, repo_path: str) -> None:
        args = ["wiki", repo_path]
        rc, out, err = await self._run_cli(args, timeout=600)
        if rc != 0:
            raise RuntimeError(f"gitnexus wiki failed: {err}")
        logger.info(f"Wiki generated for {repo_path}")

    # ── GitNexus CLI: group management ──

    async def group_create(self, group_name: str) -> None:
        rc, _, err = await self._run_cli(["group", "create", group_name])
        if rc != 0:
            logger.warning(f"group create {group_name} failed (may already exist): {err}")

    async def group_add(self, group_name: str, repo_path: str, registry_name: str) -> None:
        rc, _, err = await self._run_cli(
            ["group", "add", group_name, repo_path, registry_name]
        )
        if rc != 0:
            logger.warning(f"group add failed: {err}")

    async def group_sync(self, group_name: str) -> None:
        rc, _, err = await self._run_cli(["group", "sync", group_name], timeout=300)
        if rc != 0:
            logger.warning(f"group sync failed: {err}")

    # ── GitNexus HTTP: search ──

    async def search(
        self, query: str, repo: str | None = None, mode: str = "hybrid", limit: int = 20
    ) -> dict:
        body: dict = {"query": query, "limit": limit, "mode": mode, "enrich": True}
        if repo:
            body["repo"] = repo
        resp = await self._client.post("/api/search", json=body)
        resp.raise_for_status()
        return resp.json()

    # ── GitNexus HTTP: query (cypher / semantic) ──

    async def query(
        self, query: str, repo: str | None = None, limit: int = 10
    ) -> dict:
        body: dict = {"query": query, "limit": limit}
        if repo:
            body["repo"] = repo
        resp = await self._client.post("/api/query", json=body)
        resp.raise_for_status()
        return resp.json()

    # ── GitNexus HTTP: repos ──

    async def get_repos(self) -> list[dict]:
        resp = await self._client.get("/api/repos")
        resp.raise_for_status()
        return resp.json()

    # ── File reads: meta.json, wiki ──

    def read_meta_json(self, repo_path: str) -> dict | None:
        meta_path = Path(repo_path) / ".gitnexus" / "meta.json"
        if not meta_path.exists():
            return None
        return json.loads(meta_path.read_text())

    def read_wiki_index(self, repo_path: str) -> list[dict]:
        wiki_dir = Path(repo_path) / ".gitnexus" / "wiki"
        if not wiki_dir.exists():
            return []
        modules = []
        for f in sorted(wiki_dir.glob("*.md")):
            modules.append({"name": f.stem, "file": f.name})
        return modules

    def read_wiki_content(self, repo_path: str, module_file: str) -> str | None:
        wiki_file = Path(repo_path) / ".gitnexus" / "wiki" / module_file
        if not wiki_file.exists():
            return None
        return wiki_file.read_text()


bridge = GitNexusBridge()
