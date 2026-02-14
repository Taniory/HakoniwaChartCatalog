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
