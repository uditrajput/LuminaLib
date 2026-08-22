import asyncio
from luminalib.db.session import SessionLocal
from luminalib.services.user_group_service import UserGroupService
from luminalib.models.user import User
from sqlalchemy import select

async def main():
    async with SessionLocal() as session:
        svc = UserGroupService(session)
        # get all users
        res = await session.execute(select(User))
        users = res.scalars().all()
        for u in users:
            ids = await svc.get_user_authorized_book_ids(u.id)
            print(f"User {u.id} ({u.email}): {ids}")

if __name__ == "__main__":
    asyncio.run(main())
