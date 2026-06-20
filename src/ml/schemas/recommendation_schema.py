"""
Pydantic schemas for the /ml/recommend endpoint.

These mirror the payload shape sent by the Node.js backend
(see recommendationService.js -> _buildMLPayload).
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ViewingHistoryItem(BaseModel):
    movie_id: Optional[str] = None
    title: Optional[str] = None
    genres: List[str] = Field(default_factory=list)
    release_year: Optional[int] = None
    watched_at: Optional[datetime] = None
    completed: Optional[bool] = True


class RatingItem(BaseModel):
    movie_id: Optional[str] = None
    title: Optional[str] = None
    genres: List[str] = Field(default_factory=list)
    rating: float = Field(..., ge=1, le=10)
    liked: Optional[bool] = False
    disliked: Optional[bool] = False
    feedback_text: Optional[str] = None


class MoodInput(BaseModel):
    mood: Optional[str] = None
    suggested_genres: List[str] = Field(default_factory=list)
    logged_at: Optional[datetime] = None

class RecommendationRequest(BaseModel):
    """
    Full request payload for POST /ml/recommend.

    Supports both:
      - The rich payload sent by the Node.js backend (mood object, viewing_history, ratings)
      - A simplified payload (selectedMood as a plain string, favoriteGenres list)
    via flexible field aliases, so the endpoint works with either naming convention.
    """

    user_id: str = Field(..., alias="userId")

    # Mood can arrive either as a nested object (from Node backend) or
    # as a flat string (selectedMood), so we accept both.
    mood: Optional[MoodInput] = None
    selected_mood: Optional[str] = Field(default=None, alias="selectedMood")

    favorite_genres: List[str] = Field(default_factory=list, alias="favoriteGenres")
    excluded_genres: List[str] = Field(default_factory=list, alias="excludedGenres")
    preferred_content_types: List[str] = Field(default_factory=list, alias="preferredContentTypes")
    preferred_languages: List[str] = Field(default_factory=list, alias="preferredLanguages")

    viewing_history: List[ViewingHistoryItem] = Field(default_factory=list, alias="viewingHistory")
    ratings: List[RatingItem] = Field(default_factory=list)

    liked_movie_ids: List[str] = Field(default_factory=list, alias="likedMovieIds")
    disliked_movie_ids: List[str] = Field(default_factory=list, alias="dislikedMovieIds")

    limit: int = Field(default=10, ge=1, le=50)

    class Config:
        populate_by_name = True
        extra = "ignore"

    def resolved_mood(self) -> Optional[str]:
        """Returns the mood string regardless of which input shape was used."""
        if self.mood and self.mood.mood:
            return self.mood.mood
        return self.selected_mood


class RecommendationSignals(BaseModel):
    matches_mood: bool = False
    matches_genre: bool = False
    matches_history: bool = False
    matches_rating: bool = False
    matches_watchlist: bool = False


class RecommendedMovie(BaseModel):
    movie_id: str
    title: str
    poster_url: Optional[str] = None
    genres: List[str]
    rating: float
    release_year: Optional[int] = None
    content_type: str = "movie"
    score: float = Field(..., description="ML confidence score between 0 and 1")
    reason: str


class RecommendationResponse(BaseModel):
    user_id: str
    total_recommendations: int
    recommendations: List[RecommendedMovie]
    model_version: str = "content-hybrid-v1"

    class Config:
        protected_namespaces = ()
