"""Database backup and restore utility."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.db.base import Base

logger = logging.getLogger("luminalib.db.backup")

BACKUP_FILE = Path("storage/database_backup.json")
SQL_DUMP_FILE = Path("luminalib_dump.sql")


async def import_sql_dump(session: AsyncSession) -> bool:
    """Executes the SQL dump file if it exists and database is empty."""
    if not SQL_DUMP_FILE.exists():
        return False

    try:
        # Check if users table is empty as a proxy for 'first time'
        result = await session.execute(text("SELECT count(*) FROM users"))
        if result.scalar() > 0:
            return False

        logger.info("Empty database detected. Applying SQL dump from %s...", SQL_DUMP_FILE)
        
        with open(SQL_DUMP_FILE, "r", encoding="utf-8") as f:
            sql_content = f.read()

        # Split by ';' and execute each statement
        # This is a simple parser, might need improvement for complex SQL
        statements = [s.strip() for s in sql_content.split(";") if s.strip()]
        for statement in statements:
            if statement.upper().startswith("BEGIN") or statement.upper().startswith("COMMIT"):
                continue
            await session.execute(text(statement))
        
        await session.commit()
        logger.info("SQL dump applied successfully.")
        return True
    except Exception as e:
        logger.error("Failed to apply SQL dump: %s", str(e))
        await session.rollback()
        return False


async def export_database(session: AsyncSession) -> None:
    """Exports all database tables to a JSON file."""
    try:
        data = {}
        for table in Base.metadata.sorted_tables:
            table_name = table.name
            result = await session.execute(text(f"SELECT * FROM {table_name}"))
            rows = result.mappings().all()

            serialized_rows = []
            for row in rows:
                serialized_row = {}
                for k, v in row.items():
                    if hasattr(v, "isoformat"):
                        serialized_row[k] = v.isoformat()
                    else:
                        serialized_row[k] = v
                serialized_rows.append(serialized_row)

            data[table_name] = serialized_rows

        BACKUP_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(BACKUP_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

        logger.info("Database backed up successfully to %s", BACKUP_FILE)
    except Exception as e:
        logger.error("Failed to backup database: %s", str(e))


async def import_database(session: AsyncSession) -> bool:
    """Imports database tables from a JSON file if it exists and tables are empty."""
    if not BACKUP_FILE.exists():
        return False

    try:
        with open(BACKUP_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        for table in Base.metadata.sorted_tables:
            table_name = table.name
            if table_name not in data or not data[table_name]:
                continue

            result = await session.execute(text(f"SELECT count(*) FROM {table_name}"))
            count = result.scalar()
            if count > 0:
                continue

            for row in data[table_name]:
                columns = ", ".join(row.keys())
                values = ", ".join(f":{k}" for k in row.keys())
                stmt = text(f"INSERT INTO {table_name} ({columns}) VALUES ({values})")
                await session.execute(stmt, row)

        logger.info("Database restored successfully from %s", BACKUP_FILE)
        return True
    except Exception as e:
        logger.error("Failed to restore database: %s", str(e))
        return False

