from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.rbac import require_permission
from app.database.database import get_db
from app.database.models import PolicyRecord
from app.schemas.schemas import PolicyPatchRequest, PolicyResponse, PolicyWriteRequest, User

router = APIRouter(prefix="/policies", tags=["policies"])

SUPPORTED_ACTIONS: dict[str, set[str]] = {
    "PII": {"Redact", "Block", "Alert"},
    "Secrets": {"Block", "Alert"},
    "Prompt Injection": {"Block", "Alert"},
    "DLP": {"Block", "Alert"},
    "Model Access": {"Restrict", "Alert"},
}


def _validate_policy(category: str, action: str) -> None:
    if action not in SUPPORTED_ACTIONS.get(category, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": f"Action '{action}' is not supported for policy category '{category}'"},
        )


@router.get("", response_model=list[PolicyResponse])
async def get_policies(
    _: User = Depends(require_permission("policies:read")),
    db: Session = Depends(get_db),
) -> list[PolicyRecord]:
    return list(db.scalars(select(PolicyRecord).order_by(PolicyRecord.created_at.asc())).all())


@router.post("", response_model=PolicyResponse)
async def create_policy(
    payload: PolicyWriteRequest,
    _: User = Depends(require_permission("policies:write")),
    db: Session = Depends(get_db),
) -> PolicyRecord:
    _validate_policy(payload.category, payload.action)
    now = datetime.now(timezone.utc)
    policy = PolicyRecord(
        id=f"policy-{uuid4().hex[:12]}",
        name=payload.name,
        description=payload.description,
        category=payload.category,
        severity=payload.severity,
        threshold=payload.threshold,
        action=payload.action,
        applies_to=payload.applies_to,
        applies_to_value=payload.applies_to_value,
        enabled=payload.enabled,
        created_at=now,
        updated_at=now,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.put("/{policy_id}", response_model=PolicyResponse)
async def replace_policy(
    policy_id: str,
    payload: PolicyWriteRequest,
    _: User = Depends(require_permission("policies:write")),
    db: Session = Depends(get_db),
) -> PolicyRecord:
    _validate_policy(payload.category, payload.action)
    policy = db.get(PolicyRecord, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Policy not found"})
    for field, value in payload.model_dump().items():
        setattr(policy, field, value)
    policy.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(policy)
    return policy


@router.patch("/{policy_id}", response_model=PolicyResponse)
async def patch_policy(
    policy_id: str,
    payload: PolicyPatchRequest,
    _: User = Depends(require_permission("policies:write")),
    db: Session = Depends(get_db),
) -> PolicyRecord:
    policy = db.get(PolicyRecord, policy_id)
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Policy not found"})
    updates = payload.model_dump(exclude_unset=True)
    category = updates.get("category", policy.category)
    action = updates.get("action", policy.action)
    _validate_policy(category, action)
    for field, value in updates.items():
        setattr(policy, field, value)
    policy.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(policy)
    return policy
