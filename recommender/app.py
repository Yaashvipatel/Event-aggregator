"""Recommendation microservice: TF-IDF + cosine similarity.

POST /recommend
  { "interests": ["coding"], "history": [{title, description, category, tags}],
    "events": [{id, title, description, category, tags}], "top_n": 6 }
-> { "recommendations": [{ "id", "score", "matched_terms": [...] }] }
"""
import os

import numpy as np
from flask import Flask, jsonify, request
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)


def event_text(e):
    """Title and tags are repeated to weigh them above the long description."""
    tags = " ".join(e.get("tags") or [])
    title = e.get("title") or ""
    category = e.get("category") or ""
    return f"{title} {title} {category} {tags} {tags} {e.get('description') or ''}"


def profile_text(interests, history):
    """Explicit interests count triple; attended events add implicit signal."""
    interest_text = " ".join(interests)
    return " ".join([interest_text] * 3 + [event_text(h) for h in history])


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/recommend")
def recommend():
    data = request.get_json(silent=True) or {}
    events = data.get("events") or []
    interests = [str(i) for i in (data.get("interests") or [])]
    history = data.get("history") or []
    top_n = max(1, min(int(data.get("top_n") or 6), 50))

    if not events:
        return jsonify(recommendations=[])

    docs = [event_text(e) for e in events]
    profile = profile_text(interests, history)
    if not profile.strip():
        return jsonify(recommendations=[])

    # Fit the vocabulary on candidate events + the profile so every profile term is known.
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
    try:
        matrix = vectorizer.fit_transform(docs + [profile])
    except ValueError:  # empty vocabulary (e.g. only stop words)
        return jsonify(recommendations=[])

    event_vecs, profile_vec = matrix[:-1], matrix[-1]
    scores = cosine_similarity(profile_vec, event_vecs).ravel()

    terms = np.array(vectorizer.get_feature_names_out())
    profile_dense = profile_vec.toarray().ravel()
    unigram_mask = np.array([0 if " " in t else 1 for t in terms])

    results = []
    for idx in np.argsort(-scores)[:top_n]:
        overlap = event_vecs[idx].toarray().ravel() * profile_dense
        overlap[unigram_mask == 0] = 0  # explain matches with single words only
        order = np.argsort(-overlap)[:3]
        top_terms = terms[order][overlap[order] > 0]
        results.append({
            "id": events[idx].get("id"),
            "score": round(float(scores[idx]), 4),
            "matched_terms": [str(t) for t in top_terms],
        })
    return jsonify(recommendations=results)


if __name__ == "__main__":
    port = int(os.environ.get("RECOMMENDER_PORT", 5001))  # 5000 is taken by AirPlay on macOS
    app.run(host=os.environ.get("RECOMMENDER_HOST", "127.0.0.1"), port=port)
