#!/usr/bin/env python3
"""
CLI script to create or promote an admin user directly in the database.

Usage (inside the backend container or with DATABASE_URL set):
    python create_admin.py <email>
    python create_admin.py <email> --username <username>

Example:
    docker compose exec backend python create_admin.py you@gmail.com
"""
import asyncio
import sys
import uuid
from sqlalchemy import select
from app.database import async_session
from app.models.user import User


async def make_admin(email: str, username: str | None = None) -> None:
    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            user.is_admin = True
            await db.commit()
            print(f"✅ Existing user '{user.username}' ({user.email}) promoted to admin.")
        else:
            # Create a new admin user (they will link their Google account on first login)
            uname = username or email.split("@")[0]
            # Ensure unique username
            base = uname
            suffix = 1
            while True:
                exists = await db.execute(select(User).where(User.username == uname))
                if not exists.scalar_one_or_none():
                    break
                uname = f"{base}{suffix}"
                suffix += 1

            new_user = User(
                id=uuid.uuid4(),
                email=email,
                username=uname,
                is_active=True,
                is_admin=True,
            )
            db.add(new_user)
            await db.commit()
            print(f"✅ Created new admin user '{uname}' ({email}).")
            print(f"   Log in with Google using {email} to link your account.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    email_arg = sys.argv[1]
    username_arg = None
    if "--username" in sys.argv:
        idx = sys.argv.index("--username")
        if idx + 1 < len(sys.argv):
            username_arg = sys.argv[idx + 1]

    asyncio.run(make_admin(email_arg, username_arg))

