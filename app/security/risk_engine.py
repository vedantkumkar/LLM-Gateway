from app.schemas.schemas import Detection, InjectionAnalysis, RiskSummary


class RiskEngine:
    def calculate(self, detections: list[Detection], injection: InjectionAnalysis, policy_score: int = 0) -> RiskSummary:
        pii_score = self._pii_score(detections)
        secret_score = 100 if any(item.category == "SECRET" for item in detections) else 0
        overall = max(
            round((pii_score * 0.25) + (secret_score * 0.35) + (injection.score * 0.35) + (policy_score * 0.05)),
            pii_score,
            secret_score,
            injection.score,
            policy_score,
        )
        overall = min(int(overall), 100)
        explanation = [
            f"PII score {pii_score}",
            f"Secret score {secret_score}",
            f"Prompt injection score {injection.score}",
            f"Policy score {policy_score}",
        ]
        return RiskSummary(
            overall_score=overall,
            risk_level=self._level(overall),
            pii_score=pii_score,
            injection_score=injection.score,
            secret_score=secret_score,
            policy_score=policy_score,
            explanation=explanation,
        )

    @staticmethod
    def _pii_score(detections: list[Detection]) -> int:
        score = 0
        for detection in detections:
            if detection.category != "PII":
                continue
            score += 45 if detection.type == "CREDIT_CARD" else 25
        return min(score, 80)

    @staticmethod
    def _level(score: int) -> str:
        if score >= 85:
            return "CRITICAL"
        if score >= 70:
            return "HIGH"
        if score >= 35:
            return "MEDIUM"
        return "LOW"
