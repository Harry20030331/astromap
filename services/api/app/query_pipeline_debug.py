"""Verbose logging for the query stream pipeline. Enable with DEBUG_QUERY_PIPELINE=1."""
from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger("aiastrology.query_pipeline")


def _enabled() -> bool:
    from app.config import DEBUG_QUERY_PIPELINE

    return DEBUG_QUERY_PIPELINE


def _raw_full() -> bool:
    from app.config import DEBUG_QUERY_PIPELINE_RAW_FULL

    return DEBUG_QUERY_PIPELINE_RAW_FULL


def log_stream_llm_input(
    *,
    session_id: str,
    locale: str | None,
    query_text: str,
    system: str,
    user_content: str,
) -> None:
    if not _enabled():
        return
    preview = query_text[:400] + ("…" if len(query_text) > 400 else "")
    logger.info(
        "[query_pipeline] === STREAM INPUT session_id=%s locale=%r query_preview=%r ===",
        session_id,
        locale,
        preview,
    )
    logger.info("[query_pipeline] system_prompt (%d chars)\n%s", len(system), system)
    if _raw_full():
        logger.info(
            "[query_pipeline] user_json FULL (%d chars)\n%s",
            len(user_content),
            user_content,
        )
    else:
        cap = 8000
        tail = user_content[:cap] + ("…[truncated]" if len(user_content) > cap else "")
        logger.info(
            "[query_pipeline] user_json (%d chars total, showing first %d)\n%s",
            len(user_content),
            min(cap, len(user_content)),
            tail,
        )


def log_stream_llm_output(
    *,
    session_id: str,
    markdown: str,
    parsed: dict[str, Any],
) -> None:
    if not _enabled():
        return
    logger.info(
        "[query_pipeline] === STREAM OUTPUT session_id=%s markdown_len=%d ===",
        session_id,
        len(markdown),
    )
    if _raw_full():
        logger.info("[query_pipeline] raw_markdown FULL:\n%s", markdown)
    else:
        cap = 6000
        if len(markdown) <= cap * 2:
            logger.info("[query_pipeline] raw_markdown:\n%s", markdown)
        else:
            mid_omit = len(markdown) - 2 * cap
            logger.info(
                "[query_pipeline] raw_markdown (head %d + tail %d; omitted middle %d)\n%s\n... --- omitted --- ...\n%s",
                cap,
                cap,
                mid_omit,
                markdown[:cap],
                markdown[-cap:],
            )
    logger.info(
        "[query_pipeline] parse_query_markdown result:\n%s",
        json.dumps(parsed, ensure_ascii=False, indent=2),
    )
