from __future__ import annotations

import re

RULES: list[tuple[str, re.Pattern[str]]] = [
    ("NET_FETCH", re.compile(r"\bfetch\s*\(", re.IGNORECASE)),
    ("NET_XMLHTTPREQUEST", re.compile(r"\bXMLHttpRequest\b", re.IGNORECASE)),
    ("NET_WEBSOCKET", re.compile(r"\bWebSocket\b", re.IGNORECASE)),
    ("NET_EVENTSOURCE", re.compile(r"\bEventSource\b", re.IGNORECASE)),
    ("NET_SENDBEACON", re.compile(r"\bsendBeacon\s*\(", re.IGNORECASE)),
    ("NET_NEW_IMAGE", re.compile(r"\bnew\s+Image\s*\(", re.IGNORECASE)),
    ("NAV_WINDOW_OPEN", re.compile(r"\bwindow\.open\s*\(", re.IGNORECASE)),
    ("NAV_LOCATION_ASSIGN", re.compile(r"\blocation\s*=", re.IGNORECASE)),
    (
        "NAV_LOCATION_ASSIGN_CALL",
        re.compile(r"\b(?:(?:window|self|top|parent)\.)?location\.assign\s*\(", re.IGNORECASE),
    ),
    (
        "NAV_LOCATION_REPLACE_CALL",
        re.compile(r"\b(?:(?:window|self|top|parent)\.)?location\.replace\s*\(", re.IGNORECASE),
    ),
    ("NAV_LOCATION_HREF", re.compile(r"\blocation\.href\b", re.IGNORECASE)),
    ("NAV_PUSHSTATE", re.compile(r"\bhistory\.pushState\s*\(", re.IGNORECASE)),
    ("DYN_EVAL", re.compile(r"\beval\s*\(", re.IGNORECASE)),
    ("DYN_FUNCTION", re.compile(r"\bFunction\s*\(", re.IGNORECASE)),
    ("DYN_IMPORT", re.compile(r"\bimport\s*\(", re.IGNORECASE)),
    ("DYN_IMPORTSCRIPTS", re.compile(r"\bimportScripts\s*\(", re.IGNORECASE)),
    (
        "DYN_CREATE_SCRIPT",
        re.compile(r"document\.createElement\s*\(\s*['\"]script['\"]\s*\)", re.IGNORECASE),
    ),
    ("STORE_LOCAL", re.compile(r"\blocalStorage\b", re.IGNORECASE)),
    ("STORE_SESSION", re.compile(r"\bsessionStorage\b", re.IGNORECASE)),
    ("STORE_INDEXEDDB", re.compile(r"\bindexedDB\b", re.IGNORECASE)),
    ("STORE_COOKIE", re.compile(r"\bdocument\.cookie\b", re.IGNORECASE)),
    ("OBF_ATOB", re.compile(r"\batob\s*\(", re.IGNORECASE)),
    ("OBF_BTOA", re.compile(r"\bbtoa\s*\(", re.IGNORECASE)),
    ("OBF_PROTO", re.compile(r"__proto__", re.IGNORECASE)),
    ("OBF_CONSTRUCTOR", re.compile(r"\.constructor\b", re.IGNORECASE)),
    ("DOS_FOR_FOREVER", re.compile(r"for\s*\(\s*;\s*;\s*\)", re.IGNORECASE)),
    ("DOS_WHILE_TRUE", re.compile(r"while\s*\(\s*true\s*\)", re.IGNORECASE)),
    ("DOS_HUGE_ARRAY", re.compile(r"\bArray\s*\(\s*1e[7-9]\s*\)", re.IGNORECASE)),
]


def _line_number(source: str, index: int) -> int:
    return source.count("\n", 0, index) + 1


def _line_excerpt(source: str, line_number: int) -> str:
    lines = source.splitlines()
    if 0 < line_number <= len(lines):
        return lines[line_number - 1].strip()[:200]
    return ""


def find_violations(source: str) -> list[dict[str, str | int]]:
    findings: list[dict[str, str | int]] = []
    seen: set[tuple[str, int]] = set()

    for rule_id, pattern in RULES:
        for match in pattern.finditer(source):
            line_number = _line_number(source, match.start())
            key = (rule_id, line_number)
            if key in seen:
                continue
            seen.add(key)
            findings.append(
                {
                    "rule_id": rule_id,
                    "line": line_number,
                    "excerpt": _line_excerpt(source, line_number),
                }
            )

    findings.sort(key=lambda item: (item["line"], item["rule_id"]))
    return findings
