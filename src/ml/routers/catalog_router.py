"""
Helper router for inspecting the mock movie catalog directly.
Useful for testing/demoing the ML service without needing
the full Node.js backend in the loop.
"""

from fastapi import APIRouter

from app.models.movie_catalog import catalog

router = APIRouter(prefix="/ml", tags=["catalog"])


@router.get("/movies")
def list_movies():
    """Returns the full mock movie catalog used by the recommendation engine."""
    return catalog.df.drop(columns=["content_soup"]).to_dict(orient="records")


@router.get("/movies/{movie_id}")
def get_movie(movie_id: str):
    """Returns a single movie's metadata by ID."""
    row = catalog.get_row(movie_id)
    if row is None:
        return {"error": f"Movie '{movie_id}' not found"}
    return row.drop("content_soup").to_dict()
