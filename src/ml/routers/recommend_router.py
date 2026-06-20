"""
Router for the /ml/recommend endpoint.

This is the single entry point the Node.js NextWatch backend calls
(via Axios) to get hybrid content-based movie recommendations.
"""

from fastapi import APIRouter, HTTPException

from ..schemas.recommendation_schema import RecommendationRequest, RecommendationResponse
from ..services.recommendation_engine import generate_recommendations

router = APIRouter(prefix="/ml", tags=["recommendations"])


@router.post("/recommend", response_model=RecommendationResponse)
def recommend(request: RecommendationRequest) -> RecommendationResponse:
    """
    Generates personalized movie recommendations using hybrid
    content-based filtering.

    Combines:
    - selected mood
    - favorite genres
    - viewing history
    - ratings / feedback
    - movie metadata (genres, mood tags, description) via TF-IDF + cosine similarity

    Returns a ranked list of recommended movies, each with a hybrid
    confidence score (0-1) and a human-readable recommendation reason.
    """
    try:
        recommendations = generate_recommendations(request)
    except Exception as exc:  # pragma: no cover - defensive guard
        raise HTTPException(status_code=500, detail=f"Recommendation engine error: {exc}")

    return RecommendationResponse(
        user_id=request.user_id,
        total_recommendations=len(recommendations),
        recommendations=recommendations,
    )
