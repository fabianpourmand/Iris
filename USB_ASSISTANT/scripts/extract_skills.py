import os
import json
import re

def extract_meta(content):
    meta = {}
    # Basic frontmatter parser
    match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        lines = match.group(1).split('\n')
        for line in lines:
            if ':' in line:
                k, v = line.split(':', 1)
                meta[k.strip()] = v.strip().strip('"')
    
    # Fallback for name/description from headers if not in frontmatter
    if 'name' not in meta:
        name_match = re.search(r'^# (.*)', content, re.MULTILINE)
        if name_match:
            meta['name'] = name_match.group(1).strip()
            
    return meta

def run():
    root = "/Users/fabian/Desktop/02_Current Projects/01_Apps/USB_AI_Assistant_Build_Guide"
    skills_dir = os.path.join(root, ".agent/skills")
    output_path = os.path.join(root, "USB_ASSISTANT/ui/src/data/skills.json")
    
    skills_list = []
    
    if not os.path.exists(skills_dir):
        print(f"Error: Skills dir not found at {skills_dir}")
        return

    for item in os.listdir(skills_dir):
        item_path = os.path.join(skills_dir, item)
        if os.path.isdir(item_path):
            skill_file = os.path.join(item_path, "SKILL.md")
            if os.path.exists(skill_file):
                with open(skill_file, "r") as f:
                    content = f.read()
                    meta = extract_meta(content)
                    meta['id'] = item
                    skills_list.append(meta)

    with open(output_path, "w") as f:
        json.dump(skills_list, f, indent=2)
    
    print(f"Extracted {len(skills_list)} skills to {output_path}")

if __name__ == "__main__":
    run()
