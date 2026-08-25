import re

from app.schemas.schemas import InjectionAnalysis


class PromptInjectionDetector:
    def __init__(self) -> None:
        self._indicators: list[tuple[str, re.Pattern[str], int]] = [
            ("ignore previous instructions", re.compile(r"ignore (all )?(the )?(previous|above|prior) instructions", re.I), 30),
            ("forget previous instructions", re.compile(r"forget (all )?(the )?(previous|above|prior) instructions", re.I), 25),
            ("reveal system prompt", re.compile(r"(reveal|show|print|display).{0,40}(system prompt|hidden instructions|developer message|system message)", re.I), 35),
            ("bypass security", re.compile(r"(bypass|disable|override).{0,30}(security|safety|policy|guardrail)", re.I), 30),
            ("jailbreak", re.compile(r"\bjailbreak\b|act without restrictions|do anything now", re.I), 25),
            ("confidential extraction", re.compile(r"(print|reveal|extract|exfiltrate).{0,50}(confidential|secret|private|sensitive)", re.I), 35),
            ("override instructions", re.compile(r"override instructions|ignore policy|new instructions supersede", re.I), 25),
        ]
        self._obfuscation = re.compile(r"(i\s*g\s*n\s*o\s*r\s*e|base64|rot13|unicode|hidden command)", re.I)

    def analyze(self, text: str) -> InjectionAnalysis:
        matched: list[str] = []
        score = 0
        for label, pattern, weight in self._indicators:
            if pattern.search(text):
                matched.append(label)
                score += weight
        if self._obfuscation.search(text):
            matched.append("obfuscation indicator")
            score += 15
        if len(matched) >= 3:
            score += 15
        score = min(score, 100)
        risk_level = self._level(score)
        reason = "No prompt injection indicators found." if not matched else "Matched: " + ", ".join(matched)
        return InjectionAnalysis(score=score, risk_level=risk_level, matched_indicators=matched, reason=reason)

    @staticmethod
    def _level(score: int) -> str:
        if score >= 85:
            return "CRITICAL"
        if score >= 70:
            return "HIGH"
        if score >= 35:
            return "MEDIUM"
        return "LOW"

