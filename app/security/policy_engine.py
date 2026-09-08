from dataclasses import dataclass
import re

from app.config import Settings
from app.schemas.schemas import Detection, InjectionAnalysis, User
from app.auth.rbac import can_access_model
from app.security.semantic_guard import SEMANTIC_BLOCK_REASON, SemanticIntentAnalysis

RESTRICTED_DISCLOSURE_REASON = "Restricted or sensitive enterprise data disclosure/exfiltration request detected."
SENSITIVE_ENTERPRISE_RE = re.compile(
    r"\b(?:internal|restricted|confidential|proprietary|company dataset|corporate dataset|"
    r"company data|important company data|important data of (?:the )?company|"
    r"private company (?:information|details)|internal company (?:information|details|records)|"
    r"confidential company (?:information|details|records)|company records|company database data|"
    r"customer records|customer data|employee records|employee data|financial records|"
    r"production api keys?|admin(?:istrator)? password|credentials|secret keys?|acquisition memo|"
    r"source code|database dump|database backup|(?:whole|entire) dataset of (?:the )?company)\b",
    re.IGNORECASE,
)
DISCLOSURE_INTENT_RE = re.compile(
    r"\b(?:external partner|outside (?:the )?company|share externally|send externally|give me|show me|"
    r"reveal|provide(?: me)?|send me|export|download|dump|extract|leak|copy|whole dataset|"
    r"entire dataset|all customer records)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class PolicyDecision:
    decision: str
    reasons: list[str]
    policy_score: int


@dataclass(frozen=True)
class EffectivePolicyConfig:
    model_access_enabled: bool = True
    secret_enabled: bool = True
    secret_action: str = "Block"
    injection_enabled: bool = True
    injection_action: str = "Block"
    injection_threshold: int = 70
    dlp_enabled: bool = True
    dlp_action: str = "Block"
    pii_enabled: bool = True
    pii_action: str = "Redact"


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
        controls: EffectivePolicyConfig | None = None,
        semantic: SemanticIntentAnalysis | None = None,
    ) -> PolicyDecision:
        controls = controls or EffectivePolicyConfig(
            injection_threshold=self.settings.prompt_injection_block_threshold,
            pii_action="Block" if self.settings.pii_action == "BLOCK" else "Redact",
            secret_action="Block" if self.settings.secret_action == "BLOCK" else "Alert",
        )
        reasons: list[str] = []
        policy_score = 0
        if controls.model_access_enabled and not can_access_model(user, model):
            reasons.append(f"Model '{model}' is not authorized for role '{user.role}'.")
            return PolicyDecision("BLOCK", reasons, 100)

        if controls.secret_enabled and any(item.category == "SECRET" for item in detections):
            reasons.append("Secret-like material was detected.")
            if controls.secret_action == "Block":
                return PolicyDecision("BLOCK", reasons, 100)
            policy_score = max(policy_score, 80)

        if controls.injection_enabled and injection.score >= controls.injection_threshold:
            reasons.append("Prompt injection risk exceeded the blocking threshold.")
            if controls.injection_action == "Block":
                return PolicyDecision("BLOCK", reasons, 90)
            policy_score = max(policy_score, 70)

        if controls.dlp_enabled and self._is_restricted_disclosure_request(prompt):
            if controls.dlp_action == "Block":
                return PolicyDecision("BLOCK", [RESTRICTED_DISCLOSURE_REASON], 100)
            reasons.append(RESTRICTED_DISCLOSURE_REASON)
            policy_score = max(policy_score, 85)

        if controls.dlp_enabled and semantic is not None and semantic.should_block:
            if controls.dlp_action == "Block":
                return PolicyDecision("BLOCK", [SEMANTIC_BLOCK_REASON], 100)
            reasons.append(SEMANTIC_BLOCK_REASON)
            policy_score = max(policy_score, 85)

        pii_types = {item.type for item in detections if item.category == "PII"}
        if controls.pii_enabled and pii_types:
            reasons.append("PII was detected and will be redacted before provider processing.")
            policy_score = max(policy_score, 40 if "CREDIT_CARD" in pii_types else 25)
            if controls.pii_action == "Block":
                return PolicyDecision("BLOCK", reasons, max(policy_score, 75))
            if controls.pii_action == "Redact":
                return PolicyDecision("REDACT_AND_ALLOW", reasons, policy_score)

        if not reasons:
            reasons.append("No blocking or redaction policy matched.")
        return PolicyDecision("ALLOW", reasons, policy_score)

    @staticmethod
    def _is_restricted_disclosure_request(prompt: str) -> bool:
        return bool(SENSITIVE_ENTERPRISE_RE.search(prompt) and DISCLOSURE_INTENT_RE.search(prompt))
