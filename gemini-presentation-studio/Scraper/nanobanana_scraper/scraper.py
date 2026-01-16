#!/usr/bin/env python3
"""
Nano Banana Prompt & Image Scraper
===================================
Scrapes GitHub repositories for Nano Banana (Gemini 2.5 Flash Image) prompts
and images, then stores them in Airtable.

Target Repositories:
- JimmyLv/awesome-nano-banana
- ZeroLu/awesome-nanobanana-pro
- PicoTrex/Awesome-Nano-Banana-images
- Super-Maker-AI/awesome-nano-banana
- muset-ai/awesome-nano-banana-pro
"""

import os
import re
import json
import base64
import hashlib
import requests
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
from urllib.parse import urljoin, urlparse
import time


@dataclass
class NanoBananaCase:
    """Represents a single Nano Banana prompt/image case."""
    case_id: str
    case_number: int
    title: str
    title_en: Optional[str]
    prompt: str
    prompt_en: Optional[str]
    author: Optional[str]
    author_url: Optional[str]
    source_repo: str
    source_url: str
    gemini_image_url: Optional[str]
    gpt4o_image_url: Optional[str]
    reference_image_required: bool
    reference_image_note: Optional[str]
    tags: List[str]
    category: Optional[str]
    scraped_at: str
    

class GitHubScraper:
    """Scrapes Nano Banana content from GitHub repositories."""
    
    REPOS = [
        {
            "owner": "JimmyLv",
            "repo": "awesome-nano-banana",
            "readme_path": "README.md",
            "branch": "main"
        },
        {
            "owner": "ZeroLu", 
            "repo": "awesome-nanobanana-pro",
            "readme_path": "README.md",
            "branch": "main"
        },
        {
            "owner": "PicoTrex",
            "repo": "Awesome-Nano-Banana-images",
            "readme_path": "README_en.md",
            "branch": "main"
        },
        {
            "owner": "Super-Maker-AI",
            "repo": "awesome-nano-banana", 
            "readme_path": "README.md",
            "branch": "main"
        },
        {
            "owner": "muset-ai",
            "repo": "awesome-nano-banana-pro",
            "readme_path": "README.md",
            "branch": "main"
        }
    ]
    
    def __init__(self, github_token: Optional[str] = None):
        self.session = requests.Session()
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "NanoBanana-Scraper/1.0"
        }
        if github_token:
            self.headers["Authorization"] = f"token {github_token}"
        self.session.headers.update(self.headers)
        
    def get_raw_content(self, owner: str, repo: str, path: str, branch: str = "main") -> str:
        """Fetch raw file content from GitHub via web scraping."""
        # Use github.com directly (allowed domain) - fetch the blob page
        url = f"https://github.com/{owner}/{repo}/raw/{branch}/{path}"
        response = self.session.get(url, allow_redirects=True)
        response.raise_for_status()
        return response.text
    
    def parse_readme_cases(self, content: str, repo_info: dict) -> List[NanoBananaCase]:
        """Parse cases from README markdown content."""
        cases = []
        repo_url = f"https://github.com/{repo_info['owner']}/{repo_info['repo']}"
        
        # Pattern to match case headers (various formats)
        # Chinese: 案例 XX：标题
        # English: Case XX: Title, Example XX: Title, No. XX: Title
        case_patterns = [
            r'#{2,3}\s*(?:案例|Case|Example|No\.?)\s*(\d+)[：:]\s*(.+?)(?:\s*\(by\s*[@\[]?([^\)]+)\)?)?$',
            r'\*\*(?:案例|Case|Example|No\.?)\s*(\d+)[：:]\s*(.+?)\*\*',
        ]
        
        # Split by case sections
        sections = re.split(r'(?=#{2,3}\s*(?:案例|Case|Example|No\.?)\s*\d+)', content, flags=re.MULTILINE)
        
        for section in sections[1:]:  # Skip content before first case
            case = self._parse_case_section(section, repo_info, repo_url)
            if case:
                cases.append(case)
                
        return cases
    
    def _parse_case_section(self, section: str, repo_info: dict, repo_url: str) -> Optional[NanoBananaCase]:
        """Parse a single case section from markdown."""
        lines = section.strip().split('\n')
        if not lines:
            return None
            
        # Extract case number and title from header
        header_match = re.match(
            r'#{2,3}\s*(?:案例|Case|Example|No\.?)\s*(\d+)[：:]\s*(.+?)(?:\s*\(by\s*[@\[]?([^\)\]]+)[\)\]]?)?$',
            lines[0]
        )
        
        if not header_match:
            return None
            
        case_number = int(header_match.group(1))
        title = header_match.group(2).strip()
        author = header_match.group(3).strip() if header_match.group(3) else None
        
        # Clean up author (remove @ and brackets)
        if author:
            author = re.sub(r'^[@\[]|[\]\)]$', '', author)
        
        # Extract author URL
        author_url = None
        author_match = re.search(r'\[@?([^\]]+)\]\(([^\)]+)\)', lines[0])
        if author_match:
            author = author_match.group(1)
            author_url = author_match.group(2)
        
        # Extract images
        gemini_img = None
        gpt4o_img = None
        
        # Look for image URLs in markdown
        img_matches = re.findall(r'!\[([^\]]*)\]\(([^\)]+)\)', section)
        for alt_text, img_url in img_matches:
            alt_lower = alt_text.lower()
            if 'gemini' in alt_lower:
                gemini_img = img_url
            elif 'gpt' in alt_lower or '4o' in alt_lower:
                gpt4o_img = img_url
            elif not gemini_img:  # Default to first image as gemini
                gemini_img = img_url
                
        # Extract prompt - look for prompt sections
        prompt = ""
        prompt_en = None
        
        # Chinese prompt patterns
        zh_prompt_match = re.search(r'提示词[：\s]*\n+([\s\S]+?)(?=\n\n注意|需上传|$)', section)
        if zh_prompt_match:
            prompt = zh_prompt_match.group(1).strip()
            
        # English prompt patterns  
        en_prompt_match = re.search(r'(?:Prompt|prompt)[：\s]*\n+([\s\S]+?)(?=\n\n(?:Note|Reference|注意)|$)', section)
        if en_prompt_match:
            prompt_en = en_prompt_match.group(1).strip()
            if not prompt:
                prompt = prompt_en
                
        # Check for reference image requirement
        ref_required = bool(re.search(r'需上传参考图片|Reference Image Required', section))
        ref_note = None
        ref_match = re.search(r'(?:需上传参考图片|Reference Image Required)[：:]\s*(.+?)(?:\n|$)', section)
        if ref_match:
            ref_note = ref_match.group(1).strip()
            
        # Extract tags/categories from title
        tags = self._extract_tags(title, prompt)
        category = self._categorize_case(title, prompt, tags)
        
        # Generate unique ID
        case_id = hashlib.md5(f"{repo_info['repo']}_{case_number}_{title}".encode()).hexdigest()[:12]
        
        return NanoBananaCase(
            case_id=case_id,
            case_number=case_number,
            title=title,
            title_en=self._translate_title(title) if self._is_chinese(title) else title,
            prompt=prompt,
            prompt_en=prompt_en,
            author=author,
            author_url=author_url,
            source_repo=f"{repo_info['owner']}/{repo_info['repo']}",
            source_url=repo_url,
            gemini_image_url=gemini_img,
            gpt4o_image_url=gpt4o_img,
            reference_image_required=ref_required,
            reference_image_note=ref_note,
            tags=tags,
            category=category,
            scraped_at=datetime.utcnow().isoformat()
        )
    
    def _is_chinese(self, text: str) -> bool:
        """Check if text contains Chinese characters."""
        return bool(re.search(r'[\u4e00-\u9fff]', text))
    
    def _translate_title(self, title: str) -> str:
        """Simple title translation mapping for common patterns."""
        # This could be enhanced with an actual translation API
        translations = {
            "实物与手绘涂鸦创意广告": "Real Object with Hand-drawn Doodle Creative Ad",
            "黑白肖像艺术": "Black and White Portrait Art",
            "磨砂玻璃后的虚实对比剪影": "Silhouette Behind Frosted Glass",
            "可爱温馨针织玩偶": "Cute Cozy Knitted Doll",
            "定制动漫手办": "Custom Anime Figure",
            "玻璃质感重塑": "Glass Texture Retexturing",
            "透视3D出屏效果": "3D Pop-out Perspective Effect",
            "乐高城市景观": "LEGO City Landscape",
            "水晶球故事场景": "Crystal Ball Story Scene",
        }
        return translations.get(title, title)
    
    def _extract_tags(self, title: str, prompt: str) -> List[str]:
        """Extract relevant tags from title and prompt."""
        tags = []
        
        tag_keywords = {
            "3D": ["3d", "3D", "三维", "立体"],
            "Q版": ["q版", "Q版", "chibi", "cute"],
            "玻璃": ["glass", "玻璃", "transparent"],
            "像素": ["pixel", "8bit", "8-bit", "像素"],
            "乐高": ["lego", "乐高"],
            "动漫": ["anime", "动漫", "漫画"],
            "手办": ["figure", "手办", "figurine"],
            "海报": ["poster", "海报"],
            "Logo": ["logo", "标志"],
            "Emoji": ["emoji", "表情"],
            "复古": ["retro", "vintage", "复古", "怀旧"],
            "极简": ["minimal", "极简", "简约"],
            "超现实": ["surreal", "超现实"],
            "蒸汽朋克": ["steampunk", "蒸汽朋克"],
            "赛博朋克": ["cyberpunk", "赛博朋克"],
            "写实": ["realistic", "photorealistic", "写实", "超写实"],
            "水晶球": ["crystal ball", "水晶球"],
            "针织": ["knit", "针织", "钩织"],
            "珐琅": ["enamel", "珐琅"],
            "吉卜力": ["ghibli", "吉卜力"],
            "皮克斯": ["pixar", "皮克斯"],
        }
        
        combined_text = f"{title} {prompt}".lower()
        
        for tag, keywords in tag_keywords.items():
            if any(kw.lower() in combined_text for kw in keywords):
                tags.append(tag)
                
        return tags
    
    def _categorize_case(self, title: str, prompt: str, tags: List[str]) -> str:
        """Categorize the case based on content."""
        combined = f"{title} {prompt}".lower()
        
        categories = {
            "Portrait & Character": ["portrait", "肖像", "人物", "character", "角色"],
            "Product & Mockup": ["product", "产品", "mockup", "键帽", "keycap", "jewelry"],
            "Style Transfer": ["style", "风格", "transform", "转换", "变换"],
            "Scene & Environment": ["scene", "场景", "landscape", "景观", "environment"],
            "Icon & Logo": ["icon", "logo", "图标", "标志", "badge", "徽章"],
            "Creative Art": ["art", "艺术", "creative", "创意"],
            "Miniature & Toy": ["miniature", "迷你", "toy", "玩具", "figure", "手办"],
            "Text & Typography": ["text", "文字", "typography", "字体"],
            "Food & Object": ["food", "食物", "object", "物体"],
        }
        
        for category, keywords in categories.items():
            if any(kw in combined for kw in keywords):
                return category
                
        return "General"
    
    def scrape_all_repos(self) -> List[NanoBananaCase]:
        """Scrape all configured repositories."""
        all_cases = []
        
        for repo_info in self.REPOS:
            print(f"Scraping {repo_info['owner']}/{repo_info['repo']}...")
            try:
                content = self.get_raw_content(
                    repo_info['owner'],
                    repo_info['repo'],
                    repo_info['readme_path'],
                    repo_info['branch']
                )
                cases = self.parse_readme_cases(content, repo_info)
                print(f"  Found {len(cases)} cases")
                all_cases.extend(cases)
                time.sleep(1)  # Rate limiting
            except Exception as e:
                print(f"  Error: {e}")
                
        return all_cases


class AirtableClient:
    """Client for Airtable API operations."""
    
    def __init__(self, api_key: str, base_id: str, table_name: str = "NanoBanana"):
        self.api_key = api_key
        self.base_id = base_id
        self.table_name = table_name
        self.base_url = f"https://api.airtable.com/v0/{base_id}/{table_name}"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
    def create_record(self, case: NanoBananaCase) -> dict:
        """Create a single record in Airtable."""
        fields = {
            "Case ID": case.case_id,
            "Case Number": case.case_number,
            "Title": case.title,
            "Title (EN)": case.title_en or "",
            "Prompt": case.prompt[:100000] if case.prompt else "",  # Airtable limit
            "Prompt (EN)": case.prompt_en[:100000] if case.prompt_en else "",
            "Author": case.author or "",
            "Author URL": case.author_url or "",
            "Source Repo": case.source_repo,
            "Source URL": case.source_url,
            "Gemini Image URL": case.gemini_image_url or "",
            "GPT-4o Image URL": case.gpt4o_image_url or "",
            "Reference Required": case.reference_image_required,
            "Reference Note": case.reference_image_note or "",
            "Tags": ", ".join(case.tags),
            "Category": case.category or "",
            "Scraped At": case.scraped_at,
        }
        
        # Add image attachments if URLs exist
        if case.gemini_image_url:
            fields["Gemini Image"] = [{"url": case.gemini_image_url}]
        if case.gpt4o_image_url:
            fields["GPT-4o Image"] = [{"url": case.gpt4o_image_url}]
            
        payload = {"fields": fields}
        
        response = requests.post(
            self.base_url,
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def batch_create_records(self, cases: List[NanoBananaCase], batch_size: int = 10) -> List[dict]:
        """Create multiple records in batches (Airtable limit is 10 per request)."""
        results = []
        
        for i in range(0, len(cases), batch_size):
            batch = cases[i:i + batch_size]
            records = []
            
            for case in batch:
                fields = {
                    "Case ID": case.case_id,
                    "Case Number": case.case_number,
                    "Title": case.title,
                    "Title (EN)": case.title_en or "",
                    "Prompt": case.prompt[:100000] if case.prompt else "",
                    "Prompt (EN)": case.prompt_en[:100000] if case.prompt_en else "",
                    "Author": case.author or "",
                    "Author URL": case.author_url or "",
                    "Source Repo": case.source_repo,
                    "Source URL": case.source_url,
                    "Gemini Image URL": case.gemini_image_url or "",
                    "GPT-4o Image URL": case.gpt4o_image_url or "",
                    "Reference Required": case.reference_image_required,
                    "Reference Note": case.reference_image_note or "",
                    "Tags": ", ".join(case.tags),
                    "Category": case.category or "",
                    "Scraped At": case.scraped_at,
                }
                
                if case.gemini_image_url:
                    fields["Gemini Image"] = [{"url": case.gemini_image_url}]
                if case.gpt4o_image_url:
                    fields["GPT-4o Image"] = [{"url": case.gpt4o_image_url}]
                    
                records.append({"fields": fields})
            
            payload = {"records": records}
            
            try:
                response = requests.post(
                    self.base_url,
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()
                results.append(response.json())
                print(f"  Uploaded batch {i//batch_size + 1}: {len(batch)} records")
            except Exception as e:
                print(f"  Error uploading batch: {e}")
                
            time.sleep(0.2)  # Rate limiting
            
        return results
    
    def get_existing_case_ids(self) -> set:
        """Get all existing case IDs to avoid duplicates."""
        case_ids = set()
        offset = None
        
        while True:
            params = {"fields[]": "Case ID"}
            if offset:
                params["offset"] = offset
                
            response = requests.get(
                self.base_url,
                headers=self.headers,
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            for record in data.get("records", []):
                case_id = record.get("fields", {}).get("Case ID")
                if case_id:
                    case_ids.add(case_id)
                    
            offset = data.get("offset")
            if not offset:
                break
                
        return case_ids


def export_to_json(cases: List[NanoBananaCase], output_path: str):
    """Export cases to a JSON file."""
    data = [asdict(case) for case in cases]
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Exported {len(cases)} cases to {output_path}")


def export_to_csv(cases: List[NanoBananaCase], output_path: str):
    """Export cases to a CSV file."""
    import csv
    
    if not cases:
        return
        
    fieldnames = list(asdict(cases[0]).keys())
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for case in cases:
            row = asdict(case)
            row['tags'] = ', '.join(row['tags'])
            writer.writerow(row)
            
    print(f"Exported {len(cases)} cases to {output_path}")


def main():
    """Main execution function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Scrape Nano Banana prompts from GitHub')
    parser.add_argument('--github-token', help='GitHub personal access token (optional)')
    parser.add_argument('--airtable-key', help='Airtable API key')
    parser.add_argument('--airtable-base', help='Airtable base ID')
    parser.add_argument('--airtable-table', default='NanoBanana', help='Airtable table name')
    parser.add_argument('--output-json', default='nanobanana_cases.json', help='JSON output file')
    parser.add_argument('--output-csv', default='nanobanana_cases.csv', help='CSV output file')
    parser.add_argument('--skip-airtable', action='store_true', help='Skip Airtable upload')
    
    args = parser.parse_args()
    
    # Environment variables as fallback
    github_token = args.github_token or os.environ.get('GITHUB_TOKEN')
    airtable_key = args.airtable_key or os.environ.get('AIRTABLE_API_KEY')
    airtable_base = args.airtable_base or os.environ.get('AIRTABLE_BASE_ID')
    
    # Scrape GitHub
    print("=" * 60)
    print("Nano Banana Prompt Scraper")
    print("=" * 60)
    
    scraper = GitHubScraper(github_token)
    cases = scraper.scrape_all_repos()
    
    print(f"\nTotal cases scraped: {len(cases)}")
    
    # Export to files
    export_to_json(cases, args.output_json)
    export_to_csv(cases, args.output_csv)
    
    # Upload to Airtable
    if not args.skip_airtable and airtable_key and airtable_base:
        print("\nUploading to Airtable...")
        client = AirtableClient(airtable_key, airtable_base, args.airtable_table)
        
        # Check for existing records
        existing_ids = client.get_existing_case_ids()
        new_cases = [c for c in cases if c.case_id not in existing_ids]
        
        if new_cases:
            print(f"Found {len(new_cases)} new cases to upload")
            client.batch_create_records(new_cases)
        else:
            print("No new cases to upload")
    elif not args.skip_airtable:
        print("\nSkipping Airtable upload (credentials not provided)")
        print("Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables")
        print("Or use --airtable-key and --airtable-base arguments")
    
    print("\nDone!")


if __name__ == "__main__":
    main()
