from dataclasses import dataclass
import re

from app.config import Settings
from app.schemas.schemas import Detection, InjectionAnalysis, User
from app.auth.rbac import can_access_model

RESTRICTED_DISCLOSURE_REASON = "Restricted or sensitive enterprise data disclosure/exfiltration request detected."
SENSITIVE_ENTERPRISE_RE = re.compile(
    r"\b(?:internal|restricted|confidential|proprietary|company dataset|corporate dataset|company data|"
    r"customer records|customer data|employee records|employee data|financial records|"
    r"production api keys?|admin(?:istrator)? password|credentials|secret keys?|acquisition memo|"
    r"source code|database dump|database backup|(?:whole|entire) dataset of (?:the )?company)\b",
    re.IGNORECASE,
)
DISCLOSURE_INTENT_RE = re.compile(
    r"\b(?:external partner|outside (?:the )?company|share externally|send externally|give me|show me|"
    r"reveal|provide me|send me|export|download|dump|extract|leak|copy|whole dataset|"
    r"entire dataset|all customer records)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class PolicyDecision:
    decision: str
    reasons: list[str]
    policy_score: int


class PolicyEngine:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def decide(
        self,
        user: User,
        model: str,
        prompt: str,
        detections: list[Detection],
        injection: InjectionAnalysis,
    ) -> PolicyDecision:
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

        if self._is_restricted_disclosure_request(prompt):
            return PolicyDecision("BLOCK", [RESTRICTED_DISCLOSURE_REASON], 100)

        pii_types = {item.type for item in detections if item.category == "PII"}
        if pii_types:
            reasons.append("PII was detected and will be redacted before provider processing.")
            policy_score = 40 if "CREDIT_CARD" in pii_types else 25
            return PolicyDecision("REDACT_AND_ALLOW", reasons, policy_score)

        reasons.append("No blocking or redaction policy matched.")
        return PolicyDecision("ALLOW", reasons, policy_score)

    @staticmethod
    def _is_restricted_disclosure_request(prompt: str) -> bool:
        return bool(SENSITIVE_ENTERPRISE_RE.search(prompt) and DISCLOSURE_INTENT_RE.search(prompt))
