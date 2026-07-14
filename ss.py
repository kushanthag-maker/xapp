#!/usr/bin/env python3
"""
Website Recon Tool for Termux
=============================
Run this in Termux to get detailed information about any website.

Usage:
  python website_recon.py https://example.com

Features:
- HTTP headers & status
- Server & hosting info
- Page title, meta tags (description, keywords, etc.)
- Basic tech stack hints
- Link, image, script counts
- Security headers check
- IP address & basic SSL info
- Final redirected URL

IMPORTANT DISCLAIMER:
This tool is for EDUCATIONAL and LEGAL use only.
- Only analyze websites you own or have explicit permission to scan.
- Do NOT use it to scrape, copy, or redistribute copyrighted content.
- Do NOT use it to build illegal streaming sites or pirate content.
- Respect robots.txt and website terms of service.
If you are building something like a TV streaming site, you MUST get proper licenses.

Created for learning purposes.
"""

import sys
import requests
from bs4 import BeautifulSoup
import socket
from urllib.parse import urlparse, urljoin
import ssl
import datetime

# Colors for Termux / terminal (ANSI)
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_section(title):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}{Colors.BOLD}{title.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def get_ip_address(domain):
    try:
        return socket.gethostbyname(domain)
    except:
        return "Could not resolve"

def check_security_headers(headers):
    security_headers = {
        'Strict-Transport-Security': 'HSTS (forces HTTPS)',
        'Content-Security-Policy': 'CSP (prevents XSS)',
        'X-Frame-Options': 'Clickjacking protection',
        'X-Content-Type-Options': 'MIME sniffing protection',
        'Referrer-Policy': 'Referrer information control',
        'Permissions-Policy': 'Feature policy',
        'X-XSS-Protection': 'Old XSS filter'
    }
    
    found = []
    missing = []
    
    for header, description in security_headers.items():
        if header in headers:
            found.append(f"  {Colors.OKGREEN}✓ {header}: {headers[header][:80]}{Colors.ENDC}")
        else:
            missing.append(f"  {Colors.WARNING}✗ {header} - {description}{Colors.ENDC}")
    
    return found, missing

def analyze_website(url):
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    print(f"{Colors.OKBLUE}Analyzing: {url}{Colors.ENDC}")
    print(f"Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Termux) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        final_url = response.url
        status_code = response.status_code
        response_headers = dict(response.headers)
        
    except requests.exceptions.RequestException as e:
        print(f"{Colors.FAIL}Error connecting to website: {e}{Colors.ENDC}")
        return
    
    # Basic Info
    print_section("BASIC INFORMATION")
    print(f"Original URL      : {url}")
    print(f"Final URL         : {final_url}")
    print(f"Status Code       : {status_code} {'(OK)' if status_code == 200 else '(Check this)'}")
    print(f"Content Type      : {response_headers.get('Content-Type', 'Unknown')}")
    print(f"Content Length    : {response_headers.get('Content-Length', 'Unknown')} bytes")
    print(f"Server            : {response_headers.get('Server', 'Unknown')}")
    print(f"Powered By        : {response_headers.get('X-Powered-By', 'Not specified')}")
    
    # IP & Hosting
    print_section("HOSTING & NETWORK")
    parsed = urlparse(final_url)
    domain = parsed.netloc
    ip = get_ip_address(domain)
    print(f"Domain            : {domain}")
    print(f"IP Address        : {ip}")
    print(f"Protocol          : {parsed.scheme.upper()}")
    
    # SSL Info (basic)
    if parsed.scheme == 'https':
        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    print(f"SSL Issuer        : {cert.get('issuer', [('', '')])[-1][-1] if cert.get('issuer') else 'Unknown'}")
                    print(f"SSL Valid Until   : {cert.get('notAfter', 'Unknown')}")
        except:
            print(f"SSL Info          : Could not retrieve detailed cert info")
    
    # Security Headers
    print_section("SECURITY HEADERS")
    found_sec, missing_sec = check_security_headers(response_headers)
    
    if found_sec:
        print(f"{Colors.OKGREEN}Present Security Headers:{Colors.ENDC}")
        for h in found_sec:
            print(h)
    else:
        print(f"{Colors.WARNING}No major security headers detected.{Colors.ENDC}")
    
    if missing_sec:
        print(f"\n{Colors.WARNING}Missing / Weak Security Headers:{Colors.ENDC}")
        for h in missing_sec:
            print(h)
    
    # Parse HTML
    print_section("PAGE CONTENT ANALYSIS")
    try:
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Title
        title = soup.title.string.strip() if soup.title and soup.title.string else "No title found"
        print(f"Page Title        : {title[:100]}")
        
        # Meta tags
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            print(f"Meta Description  : {meta_desc.get('content', '')[:150]}")
        
        meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
        if meta_keywords:
            print(f"Meta Keywords     : {meta_keywords.get('content', '')[:150]}")
        
        # Generator (tech hint)
        generator = soup.find('meta', attrs={'name': 'generator'})
        if generator:
            print(f"Generator         : {generator.get('content', '')}")
        
        # Count elements
        links = soup.find_all('a', href=True)
        images = soup.find_all('img')
        scripts = soup.find_all('script')
        styles = soup.find_all('link', rel='stylesheet')
        forms = soup.find_all('form')
        
        print(f"\nLinks found       : {len(links)}")
        print(f"Images found      : {len(images)}")
        print(f"Scripts found     : {len(scripts)}")
        print(f"Stylesheets       : {len(styles)}")
        print(f"Forms found       : {len(forms)}")
        
        # External domains (basic)
        external_domains = set()
        for link in links:
            href = link['href']
            if href.startswith('http'):
                ext_domain = urlparse(href).netloc
                if ext_domain and ext_domain != domain:
                    external_domains.add(ext_domain)
        
        if external_domains:
            print(f"\nExternal domains linked: {len(external_domains)}")
            for d in list(external_domains)[:8]:  # show first 8
                print(f"  - {d}")
            if len(external_domains) > 8:
                print(f"  ... and {len(external_domains)-8} more")
        
        # Tech stack hints (very basic)
        print_section("TECHNOLOGY HINTS (Basic Detection)")
        tech_hints = []
        
        # Check for common frameworks from source
        page_text = response.text.lower()
        if 'wordpress' in page_text or '/wp-content/' in page_text:
            tech_hints.append("WordPress (likely)")
        if 'shopify' in page_text:
            tech_hints.append("Shopify")
        if 'react' in page_text or '__react' in page_text:
            tech_hints.append("React.js")
        if 'vue' in page_text:
            tech_hints.append("Vue.js")
        if 'angular' in page_text:
            tech_hints.append("Angular")
        if 'jquery' in page_text:
            tech_hints.append("jQuery")
        if 'bootstrap' in page_text:
            tech_hints.append("Bootstrap CSS")
        if 'cloudflare' in str(response_headers).lower():
            tech_hints.append("Cloudflare (CDN/WAF)")
        
        if tech_hints:
            for t in tech_hints:
                print(f"  {Colors.OKGREEN}• {t}{Colors.ENDC}")
        else:
            print("  No obvious framework detected from basic scan.")
        
        print(f"\n{Colors.WARNING}Note: This is basic detection only. For professional tech stack use Wappalyzer or BuiltWith.{Colors.ENDC}")
        
    except Exception as e:
        print(f"{Colors.FAIL}Error parsing HTML: {e}{Colors.ENDC}")
    
    print_section("SUMMARY & RECOMMENDATIONS")
    print(f"{Colors.OKGREEN}✓ Analysis complete for: {final_url}{Colors.ENDC}")
    print(f"{Colors.WARNING}⚠ Remember: Use this information responsibly and legally.{Colors.ENDC}")
    print(f"{Colors.OKCYAN}Tip: For deeper analysis install 'whatweb' or use online tools like builtwith.com{Colors.ENDC}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"{Colors.FAIL}Usage: python website_recon.py <URL>{Colors.ENDC}")
        print("Example: python website_recon.py https://sirasatv.lk")
        print("Example: python website_recon.py example.com")
        sys.exit(1)
    
    target_url = sys.argv[1]
    analyze_website(target_url)
