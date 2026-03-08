import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from luminalib.infrastructure.llm.docker_model_provider import DockerModelProvider

@pytest.mark.asyncio
async def test_docker_summarize_success():
    """Test successful summary generation from Docker Model Runner."""
    # Arrange
    model = "smollm2:latest"
    base_url = "http://model-runner.docker.internal/engines/v1"
    provider = DockerModelProvider(model=model, base_url=base_url)
    
    content = "This is a test book content."
    expected_summary = "1. Point 1\n2. Point 2"
    
    # Mocking the response from httpx.AsyncClient.post
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": expected_summary
                }
            }
        ]
    }
    mock_response.raise_for_status = MagicMock()
    
    # We patch the AsyncClient's post method inside the context manager
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        # Act
        summary = await provider.summarize(content)
        
        # Assert
        assert summary == expected_summary
        mock_post.assert_called_once()
        
        # Verify call details
        args, kwargs = mock_post.call_args
        assert args[0] == f"{base_url}/chat/completions"
        payload = kwargs["json"]
        assert payload["model"] == model
        assert payload["messages"][0]["role"] == "system"
        assert "summarize" in payload["messages"][0]["content"]

@pytest.mark.asyncio
async def test_docker_summarize_truncation():
    """Test that long content is truncated to avoid context window overflows."""
    # Arrange
    provider = DockerModelProvider(model="test-model")
    long_content = "X" * 6000  # Significantly longer than the 4000 limit
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"choices": [{"message": {"content": "summary"}}]}
    mock_response.raise_for_status = MagicMock()
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        # Act
        await provider.summarize(long_content)
        
        # Assert
        args, kwargs = mock_post.call_args
        user_prompt = kwargs["json"]["messages"][1]["content"]
        
        # Should contain truncation ellipsis
        assert "..." in user_prompt
        # Length of summary prompt should be roughly 4000 (truncated) + wrapper text
        assert len(user_prompt) < 4500 

@pytest.mark.asyncio
async def test_docker_model_api_error_handling():
    """Test that provider correctly handles and raises errors on API failure."""
    # Arrange
    provider = DockerModelProvider(model="test-model")
    
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    # Mapping the behavior of raise_for_status
    import httpx
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Error", request=MagicMock(), response=mock_response
    )
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        # Act & Assert
        with pytest.raises(httpx.HTTPStatusError):
            await provider.summarize("test")
