from dataclasses import dataclass

from app.config import Settings
from app.schemas.schemas import Detection, InjectionAnalysis, User
from app.auth.rbac import can_access_model


@dataclass(frozen=True)
class PolicyDecision:
    decision: str
    reasons: list[str]
    policy_score: int


class PolicyEngine:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def decide(self, user: User, model: str, detections: list[Detection], injection: InjectionAnalysis) -> PolicyDecision:
        reasons: list[str] = []
        policy_score = 0
        if not can_access_model(user, model):
            reasons.append(f"Model '{model}' is not authorized for role '{user.role}'.")
            return PolicyDecision("BLOCK", reasons, 100)

        if any(item.category == "SECRET" for item in detections):
            reasons.append("Secret-like material was detected.")
            return PolicyDecision("BLOCK", reasons, 100)

        if injection.score >= self.settings.prompt_injection_block_threshold:
            reasons.append("Prompt injection risk exceeded the blocking threshold.")
            return PolicyDecision("BLOCK", reasons, 90)

        pii_types = {item.type for item in detections if item.category == "PII"}
        if pii_types:
            reasons.append("PII was detected and will be redacted before provider processing.")
            policy_score = 40 if "CREDIT_CARD" in pii_types else 25
            return PolicyDecision("REDACT_AND_ALLOW", reasons, policy_score)

        reasons.append("No blocking or redaction policy matched.")
        return PolicyDecision("ALLOW", reasons, policy_score)

