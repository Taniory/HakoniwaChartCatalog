from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

ROOT_DIR = Path(__file__).resolve().parents[1]
SITE_DIR = ROOT_DIR / "site"
POSTS_DIR = SITE_DIR / "posts"
STATE_DIR = SITE_DIR / "state"

KEBAB_CASE_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
POST_FILE_RE = re.compile(
    r"^(?P<date>\d{4}-\d{2}-\d{2})(?:T(?P<hms>\d{6})Z(?:-(?P<seq>\d{2}))?)?\.json$"
)


class Paper(BaseModel):
    title: str
    url: str
    year: int
    venue: str


class Violation(BaseModel):
    rule_id: str
    line: int
    excerpt: str


class Safety(BaseModel):
    validator_version: str = "v0.1.0"
    attempts: int = 1
    violations: list[Violation] = Field(default_factory=list)
    mode: Literal["render", "code_only", "skip"] = "render"


class GeneratedBy(BaseModel):
    model: str
    generated_at: str


class Post(BaseModel):
    schema_version: Literal["1.1"] = "1.1"
    date: str
    title: str
    chart_id: str
    chart_name: str
    novelty_reason: str
    novelty_score: int = Field(ge=0, le=100)
    repeat_risk: Literal["low", "medium", "high"]
    near_duplicates: list[str] = Field(default_factory=list, max_length=3)
    fallback_candidates: list[str] = Field(default_factory=list, max_length=3)
    why_it_works: str
    how_to_read: list[str] = Field(min_length=1)
    use_cases: list[str] = Field(default_factory=list, min_length=1)
    data_requirements: list[dict] = Field(default_factory=list, min_length=1)
    optimal_conditions: dict = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list, max_length=5)
    aliases: list[str] = Field(default_factory=list)
    sample_data_json: dict
    transform_js: str
    echarts_js: str
    custom_series_js: str = ""
    paper: Paper | None = None
    safety: Safety
    generated_by: GeneratedBy

    @field_validator("date")
    @classmethod
    def _validate_date(cls, value: str) -> str:
        date.fromisoformat(value)
        return value

    @field_validator("chart_id")
    @classmethod
    def _validate_chart_id(cls, value: str) -> str:
        if not KEBAB_CASE_RE.fullmatch(value):
            raise ValueError("chart_id must be kebab-case")
        return value

    @field_validator("near_duplicates", "fallback_candidates")
    @classmethod
    def _validate_candidates(cls, values: list[str]) -> list[str]:
        for value in values:
            if not KEBAB_CASE_RE.fullmatch(value):
                raise ValueError("candidate ids must be kebab-case")
        return values

    @model_validator(mode="after")
    def _validate_fallback_logic(self) -> "Post":
        if self.repeat_risk == "high" and len(self.fallback_candidates) != 3:
            raise ValueError("fallback_candidates must contain 3 ids when repeat_risk is high")
        return self


def utc_now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def target_date_or_today(raw_date: str | None = None) -> str:
    if raw_date:
        date.fromisoformat(raw_date)
        return raw_date
    return date.today().isoformat()


def read_json(path: Path, default: dict | list | None = None):
    if not path.exists():
        if default is None:
            raise FileNotFoundError(path)
        return default
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path: Path, payload: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def post_path_for(date_str: str) -> Path:
    return POSTS_DIR / f"{date_str}.json"


def unique_post_path_for(date_str: str, now_utc: datetime | None = None) -> Path:
    date.fromisoformat(date_str)
    base_time = now_utc or datetime.now(tz=timezone.utc)
    time_part = base_time.strftime("%H%M%S")
    base_name = f"{date_str}T{time_part}Z"
    candidate = POSTS_DIR / f"{base_name}.json"
    if not candidate.exists():
        return candidate

    for seq in range(1, 100):
        candidate = POSTS_DIR / f"{base_name}-{seq:02d}.json"
        if not candidate.exists():
            return candidate

    raise RuntimeError(f"Could not allocate unique post path for {date_str}")


def _post_sort_key(path: Path) -> tuple[str, str, int, str]:
    match = POST_FILE_RE.fullmatch(path.name)
    if not match:
        return ("0000-00-00", "000000", -1, path.name)
    date_key = match.group("date")
    time_key = match.group("hms") or "000000"
    seq_key = int(match.group("seq") or "0")
    return (date_key, time_key, seq_key, path.name)


def latest_post_path() -> Path:
    candidates = [path for path in POSTS_DIR.glob("*.json") if path.name != "index.json"]
    if not candidates:
        raise FileNotFoundError("No post JSON found under site/posts/")
    return sorted(candidates, key=_post_sort_key, reverse=True)[0]


def latest_post_path_for_date(date_str: str) -> Path:
    normalized_date = date.fromisoformat(date_str).isoformat()
    candidates = [
        path
        for path in POSTS_DIR.glob(f"{normalized_date}*.json")
        if path.name != "index.json"
    ]
    if not candidates:
        raise FileNotFoundError(
            f"No post JSON found for {normalized_date} under site/posts/"
        )
    return sorted(candidates, key=_post_sort_key, reverse=True)[0]


def resolve_post_path(target_date: str | None = None) -> Path:
    if target_date:
        return latest_post_path_for_date(target_date)
    return latest_post_path()
