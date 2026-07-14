from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

HEADERS = {"User-Agent": "MyWikiApp/1.0 (contact@example.com)"}

@app.route('/')
def home():
    return jsonify({
        "message": "Wikipedia API is running",
        "endpoints": {
            "/search?q=<query>": "Get summary of a Wikipedia page (English)",
            "/search-si?q=<query>": "Get summary of a Wikipedia page (Sinhala)",
            "/multi?q=<query>": "Search multiple related pages"
        }
    })

# --- Single page summary (English) ---
@app.route('/search')
def search():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Please provide a query using ?q="}), 400

    formatted_query = query.strip().replace(" ", "_")
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{formatted_query}"
    res = requests.get(url, headers=HEADERS)

    if res.status_code != 200:
        return jsonify({
            "error": "Page not found",
            "status_code": res.status_code,
            "tried_url": url
        }), 404

    data = res.json()
    result = {
        "title": data.get("title"),
        "description": data.get("description"),
        "extract": data.get("extract"),
        "thumbnail": data.get("thumbnail", {}).get("source"),
        "url": data.get("content_urls", {}).get("desktop", {}).get("page")
    }
    return jsonify(result)

# --- Single page summary (Sinhala) ---
@app.route('/search-si')
def search_si():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Please provide a query using ?q="}), 400

    formatted_query = query.strip().replace(" ", "_")
    url = f"https://si.wikipedia.org/api/rest_v1/page/summary/{formatted_query}"
    res = requests.get(url, headers=HEADERS)

    if res.status_code != 200:
        return jsonify({
            "error": "Page not found",
            "status_code": res.status_code,
            "tried_url": url
        }), 404

    data = res.json()
    result = {
        "title": data.get("title"),
        "description": data.get("description"),
        "extract": data.get("extract"),
        "thumbnail": data.get("thumbnail", {}).get("source"),
        "url": data.get("content_urls", {}).get("desktop", {}).get("page")
    }
    return jsonify(result)

# --- Multiple search results ---
@app.route('/multi')
def multi_search():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Please provide a query using ?q="}), 400

    search_url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "format": "json",
        "srlimit": 5
    }
    res = requests.get(search_url, params=params, headers=HEADERS)

    if res.status_code != 200:
        return jsonify({"error": "Search failed"}), 500

    data = res.json()
    results = []
    for item in data.get("query", {}).get("search", []):
        results.append({
            "title": item.get("title"),
            "snippet": item.get("snippet").replace('<span class="searchmatch">', '').replace('</span>', '')
        })

    return jsonify({"query": query, "results": results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
