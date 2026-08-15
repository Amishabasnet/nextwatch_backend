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


class RatingEvent(BaseModel):
    """
    One (user, movie, rating) data point, used to build the platform-wide
    user-item matrix for collaborative filtering. Unlike `RatingItem`
    (which only carries the *current* user's own ratings for the content
    profile), this carries ratings from *all* users so item-item
    similarity can be computed from other people's taste patterns.
    """
    user_id: str
    movie_id: str
    rating: float = Field(..., ge=1, le=10)


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

    # Platform-wide ratings (all users, all movies) used to build the
    # user-item matrix for collaborative filtering. Optional so the
    # endpoint still works (content-only) if the caller omits it.
    all_ratings: List[RatingEvent] = Field(default_factory=list, alias="allRatings")

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
    matches_collaborative: bool = False
    matches_language: bool = False


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
    signals: RecommendationSignals = Field(default_factory=RecommendationSignals)


class RecommendationResponse(BaseModel):
    user_id: str
    total_recommendations: int
    recommendations: List[RecommendedMovie]
    model_version: str = "content-collab-hybrid-v3"

    class Config:
        protected_namespaces = ()
