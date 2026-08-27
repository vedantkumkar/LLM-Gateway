from time import perf_counter
from uuid import uuid4

from sqlalchemy.orm import Session

from app.config import Settings
from app.schemas.schemas import AnalyzeResponse, ChatRequest, ChatResponse, User
from app.security.injection_detector import PromptInjectionDetector
from app.security.pii_detector import PIIDetector
from app.security.policy_engine import PolicyEngine
from app.security.redactor import Redactor
from app.security.response_filter import ResponseFilter
from app.security.risk_engine import RiskEngine
from app.security.secret_detector import SecretDetector
from app.services.audit_service import AuditService
from app.services.llm_service import LLMProvider


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

    def analyze(self, request: ChatRequest, user: User) -> AnalyzeResponse:
        start = perf_counter()
        request_id = str(uuid4())
        secrets = self.secret_detector.detect(request.message)
        pii = self.pii_detector.suppress_overlaps(self.pii_detector.detect(request.message), secrets)
        detections = pii + secrets
        injection = self.injection_detector.analyze(request.message)
        policy = self.policy_engine.decide(user, request.model, request.message, detections, injection)
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
        analysis = self.analyze(request, user)
        response_text: str | None = None
        response_status = "NOT_CALLED"
        success = True
        if analysis.decision == "BLOCK":
            response_text = "Request blocked by the security gateway policy."
            response_status = "BLOCKED"
        else:
            provider_response = await self.llm_provider.generate(analysis.sanitized_prompt, request.model)
            response_text, response_status = self.response_filter.filter(provider_response)
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
