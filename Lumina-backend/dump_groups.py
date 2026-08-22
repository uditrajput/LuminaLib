import asyncio
from sqlalchemy import select
from luminalib.db.session import SessionLocal
from luminalib.models.user_group import UserGroup, GroupMember, BookGroupEntitlement

async def main():
    async with SessionLocal() as session:
        groups = (await session.execute(select(UserGroup))).scalars().all()
        for g in groups:
            print(f"Group: {g.id} - {g.name}")
        
        members = (await session.execute(select(GroupMember))).scalars().all()
        for m in members:
            print(f"GroupMember: Group {m.group_id}, User {m.user_id}, Role {m.role_in_group}")
        
        entitlements = (await session.execute(select(BookGroupEntitlement))).scalars().all()
        for e in entitlements:
            print(f"BookEntitlement: Group {e.group_id}, Book {e.book_id}")

if __name__ == "__main__":
    asyncio.run(main())
