from flask import Flask, jsonify, request
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote

app = Flask(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

BASE_URL = "https://letterboxd.com"


@app.route('/')
def home():
    return jsonify({
        "message": "Movie Search+Info API (Letterboxd) is running",
        "endpoints": {
            "/search?q=<movie_name>": "Search for movies (title, year, link)",
            "/info?slug=<film_slug>": "Get full info for a specific movie"
        }
    })


# --- Search movies ---
@app.route('/search')
def search():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Please provide a query using ?q="}), 400

    url = f"{BASE_URL}/search/films/{quote(query)}/"
    res = requests.get(url, headers=HEADERS, timeout=10)

    if res.status_code != 200:
        return jsonify({"error": "Search failed", "status_code": res.status_code, "tried_url": url}), 502

    soup = BeautifulSoup(res.text, "lxml")
    results = []

    for item in soup.select("li.search-result, div.film-poster, li.film-detail"):
        link_tag = item.select_one("a[href^='/film/']")
        title_tag = item.select_one(".film-title, h2 a, h3 a")

        if link_tag:
            href = link_tag.get("href")
            title = title_tag.get_text(strip=True) if title_tag else link_tag.get_text(strip=True)
            slug = href.strip("/").split("/")[-1] if "/film/" in href else None

            if slug and title:
                results.append({
                    "title": title,
                    "slug": slug,
                    "url": f"{BASE_URL}{href}"
                })

    # Deduplicate
    seen = set()
    unique_results = []
    for r in results:
        if r["slug"] not in seen:
            seen.add(r["slug"])
            unique_results.append(r)

    return jsonify({"query": query, "count": len(unique_results), "results": unique_results})


# --- Get movie info ---
@app.route('/info')
def info():
    slug = request.args.get('slug')
    if not slug:
        return jsonify({"error": "Please provide ?slug= (get it from /search first)"}), 400

    url = f"{BASE_URL}/film/{slug}/"
    res = requests.get(url, headers=HEADERS, timeout=10)

    if res.status_code != 200:
        return jsonify({"error": "Movie not found", "status_code": res.status_code, "tried_url": url}), 404

    soup = BeautifulSoup(res.text, "lxml")

    title_tag = soup.select_one("h1.headline-1, h1.filmtitle")
    title = title_tag.get_text(strip=True) if title_tag else None

    year_tag = soup.select_one("small.number a, .releaseyear a")
    year = year_tag.get_text(strip=True) if year_tag else None

    tagline_tag = soup.select_one(".tagline")
    tagline = tagline_tag.get_text(strip=True) if tagline_tag else None

    desc_tag = soup.select_one("div.truncate p, .review.body-text p")
    description = desc_tag.get_text(strip=True) if desc_tag else None

    poster_tag = soup.select_one("div.film-poster img, img.poster")
    poster = poster_tag.get("src") if poster_tag else None

    rating_tag = soup.select_one("meta[name='twitter:data2']")
    rating = rating_tag.get("content") if rating_tag else None

    directors = [a.get_text(strip=True) for a in soup.select("span.directorlist a")]
    cast = [a.get_text(strip=True) for a in soup.select("div.cast-list a.text-slug")][:10]
    genres = [a.get_text(strip=True) for a in soup.select("div#tab-genres a")]

    return jsonify({
        "title": title,
        "year": year,
        "tagline": tagline,
        "description": description,
        "poster": poster,
        "rating": rating,
        "directors": directors,
        "cast": cast,
        "genres": genres,
        "url": url
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
