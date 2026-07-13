"""Health check router — public system health endpoint."""

from fastapi import APIRouter

router = APIRouter(prefix="/api")


@router.get("/health", tags=["Sistema"])
async def health_check():
    """Health check público."""
    return {"status": "ok", "version": "3.0.0"}
