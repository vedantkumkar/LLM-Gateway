from abc import ABC, abstractmethod

import httpx

from app.config import get_settings


class LLMProviderError(RuntimeError):
    pass


class LLMConfigurationError(LLMProviderError):
    pass


class LLMProvider(ABC):
    name: str

    @abstractmethod
    async def generate(self, prompt: str, model: str) -> str:
        raise NotImplementedError


class MockLLMProvider(LLMProvider):
    name = "mock"

    async def generate(self, prompt: str, model: str) -> str:
        normalized = prompt.lower()
        if "zero trust" in normalized:
            return (
                "Zero trust architecture means every request is verified before access is granted. "
                "Users, devices, networks, and applications are treated as untrusted until identity, "
                "context, and permissions are checked."
            )
        if "cloud security" in normalized:
            return "Cloud security combines identity controls, encryption, monitoring, and least-privilege access to protect cloud systems."
        if "payment security" in normalized:
            return "Payment security focuses on encrypting card data, reducing data retention, monitoring fraud, and following PCI DSS practices."
        return (
            "This request was processed successfully through the secure mock LLM provider. "
            "No external API key or paid model was used."
        )


class GeminiLLMProvider(LLMProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str, timeout_seconds: float = 30.0) -> None:
        if not api_key:
            raise LLMConfigurationError("GEMINI_API_KEY is required when LLM_PROVIDER is set to gemini.")
        self._api_key = api_key
        self._model = model
        self._timeout = httpx.Timeout(timeout_seconds, connect=5.0)

    async def generate(self, prompt: str, model: str) -> str:
        del model
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self._model}:generateContent"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "thinkingConfig": {"thinkingBudget": 0},
                "maxOutputTokens": 512,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(url, headers={"x-goog-api-key": self._api_key}, json=payload)
        except httpx.TimeoutException as exc:
            raise LLMProviderError("Gemini request timed out.") from exc
        except httpx.HTTPError as exc:
            raise LLMProviderError("Gemini request failed.") from exc

        if response.status_code >= 400:
            raise LLMProviderError(f"Gemini API returned an error status: {response.status_code}.")

        try:
            data = response.json()
        except ValueError as exc:
            raise LLMProviderError("Gemini API returned a malformed response.") from exc

        text = self._extract_text(data)
        if not text:
            raise LLMProviderError("Gemini API returned an empty response.")
        return text

    @staticmethod
    def _extract_text(data: dict) -> str:
        candidates = data.get("candidates")
        if not isinstance(candidates, list):
            return ""

        parts_text: list[str] = []
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            content = candidate.get("content")
            if not isinstance(content, dict):
                continue
            parts = content.get("parts")
            if not isinstance(parts, list):
                continue
            for part in parts:
                if isinstance(part, dict) and isinstance(part.get("text"), str):
                    parts_text.append(part["text"])

        return "".join(parts_text).strip()


def get_llm_provider(provider_name: str = "mock") -> LLMProvider:
    provider = provider_name.strip().lower()
    if provider == "mock":
        return MockLLMProvider()
    if provider == "gemini":
        settings = get_settings()
        return GeminiLLMProvider(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
        )
    raise LLMConfigurationError(f"Unknown LLM_PROVIDER '{provider_name}'.")
