from time import perf_counter
from uuid import uuid4

from sqlalchemy.orm import Session

from app.database.models import GatewaySettingsRecord, PolicyRecord
from app.config import Settings
from app.schemas.schemas import AnalyzeResponse, ChatRequest, ChatResponse, User
from app.security.injection_detector import PromptInjectionDetector
from app.security.pii_detector import PIIDetector
from app.security.policy_engine import PolicyEngine
from app.security.policy_engine import EffectivePolicyConfig
from app.security.redactor import Redactor
from app.security.response_filter import ResponseFilter
from app.security.risk_engine import RiskEngine
from app.security.secret_detector import SecretDetector
from app.services.audit_service import AuditService
from app.services.llm_service import LLMProvider, LLMProviderError


class GatewayService:
    def __init__(self, settings: Settings, llm_provider: LLMProvider) -> None:
        self.settings = settings
        self.llm_provider = llm_provider
        self.pii_detector = PIIDetector()
        self.secret_detector = SecretDetector()
        self.injection_detector = PromptInjectionDetector()
        self.redactor = Redactor()
        self.risk_engine = RiskEngine()
        self.policy_engine = PolicyEngine(settings)
        self.response_filter = ResponseFilter()
        self.audit_service = AuditService()

    def _effective_policies(self, db: Session | None = None) -> EffectivePolicyConfig:
        if db is None:
            return EffectivePolicyConfig(
                injection_threshold=self.settings.prompt_injection_block_threshold,
                pii_action="Block" if self.settings.pii_action == "BLOCK" else "Redact",
                secret_action="Block" if self.settings.secret_action == "BLOCK" else "Alert",
            )
        policies = list(db.query(PolicyRecord).all())

        def first(category: str) -> PolicyRecord | None:
            return next((policy for policy in policies if policy.category == category), None)

        pii = first("PII")
        secret = first("Secrets")
        injection = first("Prompt Injection")
        dlp = first("DLP")
        model_access = first("Model Access")
        return EffectivePolicyConfig(
            model_access_enabled=model_access.enabled if model_access else True,
            secret_enabled=secret.enabled if secret else True,
            secret_action=secret.action if secret else "Block",
            injection_enabled=injection.enabled if injection else True,
            injection_action=injection.action if injection else "Block",
            injection_threshold=injection.threshold if injection else self.settings.prompt_injection_block_threshold,
            dlp_enabled=dlp.enabled if dlp else True,
            dlp_action=dlp.action if dlp else "Block",
            pii_enabled=pii.enabled if pii else True,
            pii_action=pii.action if pii else ("Block" if self.settings.pii_action == "BLOCK" else "Redact"),
        )

    def _effective_settings(self, db: Session | None = None) -> GatewaySettingsRecord | None:
        if db is None:
            return None
        return db.get(GatewaySettingsRecord, "default")

    def analyze(self, request: ChatRequest, user: User, db: Session | None = None) -> AnalyzeResponse:
        start = perf_counter()
        request_id = str(uuid4())
        secrets = self.secret_detector.detect(request.message)
        pii = self.pii_detector.suppress_overlaps(self.pii_detector.detect(request.message), secrets)
        detections = pii + secrets
        injection = self.injection_detector.analyze(request.message)
        policy = self.policy_engine.decide(
            user,
            request.model,
            request.message,
            detections,
            injection,
            self._effective_policies(db),
        )
        risk = self.risk_engine.calculate(detections, injection, policy.policy_score)
        sanitized = self.redactor.redact(request.message, detections) if policy.decision != "ALLOW" else request.message
        return AnalyzeResponse(
            request_id=request_id,
            decision=policy.decision,
            risk_score=risk.overall_score,
            risk_level=risk.risk_level,
            detections=detections,
            injection_analysis=injection,
            sanitized_prompt=sanitized,
            policy_reasons=policy.reasons,
            processing_time_ms=max(1, int((perf_counter() - start) * 1000)),
        )

    async def chat(self, request: ChatRequest, user: User, db: Session) -> ChatResponse:
        start = perf_counter()
        analysis = self.analyze(request, user, db)
        response_text: str | None = None
        response_status = "NOT_CALLED"
        success = True
        if analysis.decision == "BLOCK":
            response_text = "Request blocked by the security gateway policy."
            response_status = "BLOCKED"
        else:
            try:
                provider_response = await self.llm_provider.generate(analysis.sanitized_prompt, request.model)
                effective_settings = self._effective_settings(db)
                if effective_settings is not None and not effective_settings.enable_response_scanning:
                    response_text, response_status = provider_response, "DISABLED"
                else:
                    response_text, response_status = self.response_filter.filter(provider_response)
            except LLMProviderError as exc:
                response_text = str(exc)
                response_status = "ERROR"
                success = False
        latency = max(1, int((perf_counter() - start) * 1000))
        self.audit_service.create_event(
            db,
            request_id=analysis.request_id,
            user=user,
            model=request.model,
            decision=analysis.decision,
            risk_score=analysis.risk_score,
            risk_level=analysis.risk_level,
            detections=analysis.detections,
            sanitized_prompt=analysis.sanitized_prompt,
            response_status=response_status,
            latency_ms=latency,
            success=success,
            injection_detected=analysis.injection_analysis.score >= 35,
        )
        payload = analysis.model_dump()
        payload["processing_time_ms"] = latency
        return ChatResponse(
            **payload,
            response=response_text,
            response_scan_status=response_status,
            llm_provider=self.llm_provider.name,
        )
