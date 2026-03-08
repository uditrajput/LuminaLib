"""Structured logging configuration."""

from __future__ import annotations

import logging
from logging.config import dictConfig
from luminalib.core.config import settings


def configure_logging() -> None:
    """Configure application-wide structured logging."""
    handlers = {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
        },
    }
    
    app_handlers = ["console"]
    
    # Configure Loki if enabled
    if settings.loki_url:
        handlers["loki"] = {
            "class": "logging_loki.LokiHandler",
            "url": settings.loki_url,
            "tags": {"application": "luminalib"},
            "version": "1",
        }
        app_handlers.append("loki")

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
            },
            "handlers": handlers,
            "root": {
                "handlers": ["console"],
                "level": "INFO",
            },
            "loggers": {
                "luminalib": {
                    "handlers": app_handlers,
                    "level": "DEBUG",
                    "propagate": False,
                },
                "uvicorn": {
                    "handlers": app_handlers,
                    "level": "INFO",
                    "propagate": False,
                },
            },
        }
    )


logger = logging.getLogger("luminalib")
