from abc import ABC, abstractmethod


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


def get_llm_provider(provider_name: str = "mock") -> LLMProvider:
    if provider_name != "mock":
        return MockLLMProvider()
    return MockLLMProvider()

