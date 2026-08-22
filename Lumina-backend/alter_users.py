import asyncio
from sqlalchemy import text
from luminalib.db.session import engine

async def alter():
    async with engine.begin() as conn:
        cols = [
            "profile_completed BOOLEAN NOT NULL DEFAULT FALSE",
            "dob VARCHAR(50)",
            "profession VARCHAR(100)",
            "hobbies JSON",
            "interests JSON",
            "favorite_topics JSON",
            "favorite_genres JSON",
            "reading_preferences JSON",
            "preferred_language VARCHAR(50)",
            "education_records JSON",
            "contact_info JSON"
        ]
        for col in cols:
            try:
                await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col};"))
                print(f"Added {col}")
            except Exception as e:
                print(f"Failed to add {col}: {e}")
        print("Done altering tables")

if __name__ == "__main__":
    asyncio.run(alter())
