from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # සියලුම domains වලින් ඉල්ලීම් වලට ඉඩ දෙන්න

DB_PATH = 'subtitles.db'
UPLOAD_FOLDER = 'subtitle_files'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ========== DATABASE SETUP ==========
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            year INTEGER,
            imdb_rating REAL,
            language TEXT,
            category TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS subtitles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id INTEGER,
            language TEXT NOT NULL,
            file_path TEXT NOT NULL,
            download_count INTEGER DEFAULT 0,
            FOREIGN KEY (movie_id) REFERENCES movies (id)
        )
    ''')
    conn.commit()
    conn.close()

# ========== API ENDPOINTS ==========

# 1. සියලුම චිත්රපට ලබාගන්න
@app.route('/api/movies', methods=['GET'])
def get_movies():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM movies ORDER BY uploaded_at DESC')
    movies = c.fetchall()
    conn.close()
    
    result = []
    for m in movies:
        result.append({
            'id': m[0],
            'title': m[1],
            'year': m[2],
            'imdb_rating': m[3],
            'language': m[4],
            'category': m[5],
            'uploaded_at': m[6]
        })
    return jsonify(result)

# 2. එක් චිත්රපටයක් ගන්න (ID අනුව)
@app.route('/api/movies/<int:movie_id>', methods=['GET'])
def get_movie(movie_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM movies WHERE id = ?', (movie_id,))
    m = c.fetchone()
    conn.close()
    
    if not m:
        return jsonify({'error': 'Movie not found'}), 404
    
    return jsonify({
        'id': m[0],
        'title': m[1],
        'year': m[2],
        'imdb_rating': m[3],
        'language': m[4],
        'category': m[5],
        'uploaded_at': m[6]
    })

# 3. නව චිත්රපටයක් එකතු කරන්න (Admin)
@app.route('/api/admin/movies', methods=['POST'])
def add_movie():
    data = request.json
    required = ['title', 'year', 'language', 'category']
    if not all(key in data for key in required):
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO movies (title, year, imdb_rating, language, category)
        VALUES (?, ?, ?, ?, ?)
    ''', (data['title'], data['year'], data.get('imdb_rating'), data['language'], data['category']))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    
    return jsonify({'message': 'Movie added!', 'id': new_id}), 201

# 4. උපසිරැසි ගොනුවක් උඩුගත කරන්න (Movie ID එකට)
@app.route('/api/admin/subtitles/<int:movie_id>', methods=['POST'])
def upload_subtitle(movie_id):
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # ගොනුව save කරන්න
    ext = file.filename.split('.')[-1]
    filename = f"{movie_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    # Database එකට save කරන්න
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO subtitles (movie_id, language, file_path)
        VALUES (?, ?, ?)
    ''', (movie_id, request.form.get('language', 'Sinhala'), filepath))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Subtitle uploaded!', 'file': filename}), 201

# 5. උපසිරැසි ගොනුව Download කරන්න
@app.route('/api/download/<int:subtitle_id>', methods=['GET'])
def download_subtitle(subtitle_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT file_path, download_count FROM subtitles WHERE id = ?', (subtitle_id,))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return jsonify({'error': 'Subtitle not found'}), 404
    
    file_path = result[0]
    download_count = result[1] + 1
    
    # Download count එක update කරන්න
    c.execute('UPDATE subtitles SET download_count = ? WHERE id = ?', (download_count, subtitle_id))
    conn.commit()
    conn.close()
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found on server'}), 404
    
    return send_file(file_path, as_attachment=True)

# 6. කාණ්ඩය අනුව චිත්රපට පෙරන්න
@app.route('/api/category/<category>', methods=['GET'])
def get_by_category(category):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM movies WHERE category = ?', (category,))
    movies = c.fetchall()
    conn.close()
    
    result = [{'id': m[0], 'title': m[1], 'year': m[2]} for m in movies]
    return jsonify(result)

# ========== RUN SERVER ==========
if __name__ == '__main__':
    init_db()
    print("✅ Zoom.lk API Server එක Start වුණා!")
    print("📌 http://localhost:5000/api/movies")
    app.run(debug=True, host='0.0.0.0', port=5000)
