from flask import Flask, jsonify, request
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote

app = Flask(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
}

@app.route('/')
def home():
    return jsonify({
        "message": "Fandom Search API is running",
        "usage": "/search?q=Sri Lanka"
    })


@app.route('/search')
def search():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Please provide a query using ?q="}), 400

    encoded_query = quote(query)
    url = f"https://community.fandom.com/wiki/Special:Search?query={encoded_query}&scope=cross-wiki"

    res = requests.get(url, headers=HEADERS)

    if res.status_code != 200:
        return jsonify({
            "error": "Failed to fetch page",
            "status_code": res.status_code
        }), 502

    soup = BeautifulSoup(res.text, "lxml")

    results = []

    # Cross-wiki search result cards
    cards = soup.select("div.cross-wiki-result, li.cross-wiki-result, div.result-item, article")

    for card in cards:
        title_tag = card.select_one("a")
        snippet_tag = card.select_one("p, .result-snippet, .description")

        if title_tag:
            title = title_tag.get_text(strip=True)
            link = title_tag.get("href")
            snippet = snippet_tag.get_text(strip=True) if snippet_tag else ""

            if title and link:
                results.append({
                    "title": title,
                    "link": link,
                    "snippet": snippet
                })

    return jsonify({
        "query": query,
        "count": len(results),
        "results": results,
        "source_url": url
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
