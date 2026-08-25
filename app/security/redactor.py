from app.schemas.schemas import Detection


class Redactor:
    def redact(self, text: str, detections: list[Detection]) -> str:
        sanitized = text
        replacements = sorted(
            [item for item in detections if item.start is not None and item.end is not None],
            key=lambda item: item.start or 0,
            reverse=True,
        )
        for detection in replacements:
            sanitized = sanitized[: detection.start] + f"<{detection.type}>" + sanitized[detection.end :]
        return sanitized

