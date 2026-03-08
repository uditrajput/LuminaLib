"""S3/MinIO storage implementation."""

from __future__ import annotations

import logging
from io import BytesIO

import boto3
from botocore.exceptions import ClientError

from luminalib.core.dynamic_config import get_dynamic
from luminalib.interfaces.storage_interface import StorageInterface

logger = logging.getLogger("luminalib.storage.s3")


class S3Storage(StorageInterface):
    """S3-compatible storage implementation."""

    def __init__(
        self,
        bucket: str | None = None,
        region: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        endpoint_url: str | None = None,
    ):
        self.bucket = bucket or get_dynamic("s3_bucket", "luminalib")
        
        session_kwargs = {
            "aws_access_key_id": access_key or get_dynamic("s3_access_key"),
            "aws_secret_access_key": secret_key or get_dynamic("s3_secret_key"),
            "region_name": region or get_dynamic("s3_region", "us-east-1"),
        }
        
        client_kwargs = {
            "endpoint_url": endpoint_url or get_dynamic("s3_endpoint_url"),
        }
        
        self.client = boto3.client("s3", **session_kwargs, **client_kwargs)
        logger.info("S3Storage initialized (bucket=%s)", self.bucket)

    async def upload(self, filename: str, content: bytes) -> str:
        """Upload file to S3."""
        try:
            self.client.upload_fileobj(BytesIO(content), self.bucket, filename)
            logger.info("File uploaded to S3: %s", filename)
            return filename
        except ClientError as e:
            logger.error("S3 upload failed: %s", e)
            raise

    async def download(self, key: str) -> bytes:
        """Download file from S3."""
        try:
            fileobj = BytesIO()
            self.client.download_fileobj(self.bucket, key, fileobj)
            return fileobj.getvalue()
        except ClientError as e:
            logger.error("S3 download failed: %s", e)
            raise

    async def delete(self, key: str) -> None:
        """Delete file from S3."""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            logger.info("File deleted from S3: %s", key)
        except ClientError as e:
            logger.error("S3 delete failed: %s", e)
            raise
