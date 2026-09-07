"""
NER-LOGIX FastAPI Main Application Entry Point
Smart India Hackathon 2026 / SIH26002 - MDoNER Logistics Intelligence
"""

import logging
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.routes import api_router
from app.db.session import is_database_connected

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ner-logix-api")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Based Smart Logistics & Accessibility Intelligence Platform for NER (SIH 2026 / SIH26002)",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Configure CORS for local development and preview environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health endpoint for simple probes
@app.get("/health", tags=["Health"], summary="Root Health Check")
def root_health():
    """Direct root health endpoint for health monitoring probes."""
    db_status = "connected" if is_database_connected() else "foundation_unconnected"
    return {
        "status": "ok",
        "service": "ner-logix-api",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
        "sih_project": "SIH26002 - MDoNER",
    }


@app.get("/", tags=["Root"], summary="Root API Index")
def root_index():
    return {
        "service": "NER-LOGIX FastAPI Backend",
        "version": settings.VERSION,
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_url": "/health",
        "status": "operational",
    }


# Mount API V1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if settings.DEBUG else "An unexpected server error occurred.",
            "path": request.url.path,
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
    )
