"""Async SMTP Email Service for Account Verification & System Notifications."""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from luminalib.models.app_config import AppConfig

logger = logging.getLogger("luminalib.services.email")


async def get_smtp_configs(db: AsyncSession) -> dict[str, Any]:
    """Retrieve SMTP configuration properties from app_configs."""
    keys = [
        "smtp_enabled",
        "smtp_host",
        "smtp_port",
        "smtp_username",
        "smtp_password",
        "smtp_encryption",
        "smtp_sender_email",
        "smtp_sender_name",
        "allowed_email_domains",
    ]
    stmt = select(AppConfig).where(AppConfig.key.in_(keys))
    res = await db.execute(stmt)
    configs = {c.key: c.value for c in res.scalars().all()}

    return {
        "enabled": configs.get("smtp_enabled", "false").lower() == "true",
        "host": configs.get("smtp_host", "smtp.office365.com"),
        "port": int(configs.get("smtp_port", "587")),
        "username": configs.get("smtp_username", ""),
        "password": configs.get("smtp_password", ""),
        "encryption": configs.get("smtp_encryption", "tls").lower(),
        "sender_email": configs.get("smtp_sender_email", "noreply@luminalib.com"),
        "sender_name": configs.get("smtp_sender_name", "LuminaLib Support"),
        "allowed_domains": [
            d.strip().lower()
            for d in configs.get(
                "allowed_email_domains",
                "@gmail.com,@hotmail.com,@outlook.com,@yahoo.com,@test.com",
            ).split(",")
            if d.strip()
        ],
    }


def validate_email_domain(email: str, allowed_domains: list[str]) -> bool:
    """Validate if an email address belongs to the allowed domain whitelist."""
    if not allowed_domains:
        return True
    email_clean = email.strip().lower()
    for domain in allowed_domains:
        d_clean = domain if domain.startswith("@") else f"@{domain}"
        if email_clean.endswith(d_clean):
            return True
    return False


async def send_verification_email(
    db: AsyncSession, recipient_email: str, verification_token: str, app_url: str = "http://localhost:3000"
) -> bool:
    """Send double opt-in account verification email via SMTP if enabled."""
    smtp_cfg = await get_smtp_configs(db)
    if not smtp_cfg["enabled"]:
        logger.info("SMTP service is disabled. Verification email skipped for %s.", recipient_email)
        return True

    verify_link = f"{app_url}/auth/verify-email?token={verification_token}"
    subject = "LuminaLib — Verify Your Email Address"
    
    html_body = f"""
    <html>
      <body style="font-family: sans-serif; color: #1e293b; padding: 20px;">
        <h2>Welcome to LuminaLib!</h2>
        <p>Please click the button below to verify your email address and submit your account for Admin review:</p>
        <p style="margin: 24px 0;">
          <a href="{verify_link}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Verify Email Address
          </a>
        </p>
        <p style="font-size: 12px; color: #64748b;">Or copy this link: {verify_link}</p>
      </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{smtp_cfg['sender_name']} <{smtp_cfg['sender_email']}>"
    msg["To"] = recipient_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        if smtp_cfg["encryption"] == "ssl":
            server = smtplib.SMTP_SSL(smtp_cfg["host"], smtp_cfg["port"], timeout=10)
        else:
            server = smtplib.SMTP(smtp_cfg["host"], smtp_cfg["port"], timeout=10)
            if smtp_cfg["encryption"] == "tls":
                server.starttls()

        if smtp_cfg["username"] and smtp_cfg["password"]:
            server.login(smtp_cfg["username"], smtp_cfg["password"])

        server.sendmail(smtp_cfg["sender_email"], [recipient_email], msg.as_string())
        server.quit()
        logger.info("Successfully sent verification email to %s.", recipient_email)
        return True
    except Exception as exc:
        logger.error("Failed to send SMTP email to %s: %s", recipient_email, exc)
        return False
