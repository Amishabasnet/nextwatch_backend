"""
NextWatch ML Recommendation Service
=====================================

A FastAPI microservice providing hybrid content-based movie
recommendations for the NextWatch platform.

Run locally:
    uvicorn ml.main:app --reload --port 8000

Then the Node.js backend's ML_API_URL should point to:
    http://localhost:8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import recommend_router, catalog_router

app = FastAPI(
    title="NextWatch Recommendation Service",
    description=(
        "Hybrid content-based movie recommendation engine using "
        "TF-IDF + cosine similarity, blended with mood, genre, "
        "viewing history, and rating signals."
    ),
    version="1.0.0",
)

# Allow the Node.js backend (and local dev tools) to call this service.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommend_router.router)
app.include_router(catalog_router.router)


@app.get("/")
def health_check():
    """Basic health check / service info."""
    return {
        "service": "NextWatch ML Recommendation Service",
        "status": "running",
        "endpoints": {
            "recommend": "POST /ml/recommend",
            "list_movies": "GET /ml/movies",
            "get_movie": "GET /ml/movies/{movie_id}",
            "docs": "GET /docs",
        },
    }
