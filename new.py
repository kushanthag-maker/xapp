from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# === IMPORTANT: API KEY EKAK GATHA GANNA ===
# 1. https://www.themoviedb.org/ signup karanna (free)
# 2. Settings > API > Create API key (v3 auth)
# 3. Eka copy karala yata "YOUR_API_KEY" wenuwata paste karanna
API_KEY = "YOUR_TMDB_API_KEY_HERE"
BASE_URL = "https://api.themoviedb.org/3"

@app.route('/')
def home():
    return "Film Site API - Search & Info only (Legal TMDB)"

@app.route('/search')
def search_movies():
    query = request.args.get('q', '')
    if not query:
        return jsonify({"error": "q= parameter ekak danna (example: /search?q=spiderman)"}), 400
    
    url = f"{BASE_URL}/search/movie"
    params = {
        "api_key": API_KEY,
        "query": query,
        "language": "en-US",   # "si" danna Sinhala search try karanna puluwan
        "page": 1,
        "include_adult": False
    }
    try:
        res = requests.get(url, params=params, timeout=10)
        return jsonify(res.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/movie/<int:movie_id>')
def get_movie_details(movie_id):
    url = f"{BASE_URL}/movie/{movie_id}"
    params = {
        "api_key": API_KEY,
        "language": "en-US"
    }
    try:
        res = requests.get(url, params=params, timeout=10)
        return jsonify(res.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("API run karanna: python app.py")
    print("Test: http://127.0.0.1:5000/search?q=ben+10")
    app.run(debug=True, port=5000)
