from bs4 import BeautifulSoup

# HTML code eka methanata danna (Variable ekak widiyata)
html_content = """
<div class="entry-content">
    <p>Onna ithin ada aragena awe kannada chithrapatiyak...</p>
    <a href="https://zoom.lk/sub-download/31710">DOWNLOAD : KD: The Devil (2026) Sinhala Subtitle</a>
</div>
"""

def extract_data(html):
    soup = BeautifulSoup(html, 'html.parser')
    
    # 1. Description eka ganna
    content = soup.find('div', class_='entry-content')
    if content:
        print("--- Movie Description ---")
        print(content.get_text(separator='\n').strip())
    
    # 2. Direct Download Link eka ganna
    print("\n--- Download Links ---")
    for a in soup.find_all('a', href=True):
        if "download" in a['href'] or "sub-download" in a['href']:
            print(f"Direct Link: {a['href']}")

# Run karanna
extract_data(html_content)
