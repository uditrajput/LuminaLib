"""Models package — import all models so SQLAlchemy discovers them."""

from luminalib.models.app_config import AppConfig
from luminalib.models.base_audit_model import AuditBase
from luminalib.models.book import Book
from luminalib.models.borrow import BookBorrow
from luminalib.models.chat_message import ChatMessage
from luminalib.models.chat_session import ChatSession
from luminalib.models.document import Document
from luminalib.models.document_chunk import DocumentChunk
from luminalib.models.ingestion_job import IngestionJob
from luminalib.models.recommendation import UserPreference
from luminalib.models.review import Review
from luminalib.models.role import Role
from luminalib.models.system_config import SystemConfig
from luminalib.models.user import User
from luminalib.models.user_group import BookGroupEntitlement, GroupMember, UserGroup
from luminalib.models.voice_conversation import VoiceConversation
from luminalib.models.voice_turn import VoiceTurn

__all__ = [
    "AppConfig",
    "AuditBase",
    "Book",
    "BookBorrow",
    "BookGroupEntitlement",
    "ChatMessage",
    "ChatSession",
    "Document",
    "DocumentChunk",
    "GroupMember",
    "IngestionJob",
    "Review",
    "Role",
    "SystemConfig",
    "User",
    "UserGroup",
    "UserPreference",
    "VoiceConversation",
    "VoiceTurn",
]
