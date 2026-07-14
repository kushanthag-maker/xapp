import requests
import json

BASE_URL = "http://localhost:5000"

# 1. සියලුම චිත්රපට ලබාගන්න
print("📽️ සියලුම චිත්රපට:")
response = requests.get(f"{BASE_URL}/api/movies")
print(response.json())

# 2. නව චිත්රපටයක් එකතු කරන්න (POST)
new_movie = {
    "title": "Test Movie",
    "year": 2026,
    "imdb_rating": 7.5,
    "language": "Sinhala",
    "category": "Hollywood"
}
print("\n➕ චිත්රපටයක් එකතු කිරීම:")
response = requests.post(f"{BASE_URL}/api/admin/movies", json=new_movie)
print(response.json())

# 3. ගොනුවක් උඩුගත කරන්න (ඔබට .srt ගොනුවක් අවශ්යයි)
# files = {'file': open('subtitle.srt', 'rb')}
# data = {'language': 'Sinhala'}
# response = requests.post(f"{BASE_URL}/api/admin/subtitles/1", files=files, data=data)
# print(response.json())
