#!/usr/bin/env python3
"""
Airtable Schema Generator for Nano Banana Library
==================================================
Generates the schema JSON for creating the Airtable base.
You can use this with Airtable's API or Web Clipper.
"""

import json

SCHEMA = {
    "name": "NanoBanana Prompt Library",
    "tables": [
        {
            "name": "NanoBanana",
            "description": "Collection of Nano Banana (Gemini 2.5 Flash Image) prompts and examples",
            "fields": [
                {
                    "name": "Case ID",
                    "type": "singleLineText",
                    "description": "Unique identifier for deduplication"
                },
                {
                    "name": "Case Number",
                    "type": "number",
                    "options": {"precision": 0},
                    "description": "Original case number from source"
                },
                {
                    "name": "Title",
                    "type": "singleLineText",
                    "description": "Case title (often in Chinese)"
                },
                {
                    "name": "Title (EN)",
                    "type": "singleLineText",
                    "description": "English translation of title"
                },
                {
                    "name": "Prompt",
                    "type": "multilineText",
                    "description": "Full prompt text"
                },
                {
                    "name": "Prompt (EN)",
                    "type": "multilineText",
                    "description": "English version of prompt"
                },
                {
                    "name": "Author",
                    "type": "singleLineText",
                    "description": "Original creator's handle"
                },
                {
                    "name": "Author URL",
                    "type": "url",
                    "description": "Link to author's profile"
                },
                {
                    "name": "Source Repo",
                    "type": "singleLineText",
                    "description": "GitHub repository source"
                },
                {
                    "name": "Source URL",
                    "type": "url",
                    "description": "Direct link to source"
                },
                {
                    "name": "Gemini Image URL",
                    "type": "url",
                    "description": "Direct URL to Gemini-generated image"
                },
                {
                    "name": "GPT-4o Image URL",
                    "type": "url",
                    "description": "Direct URL to GPT-4o comparison image"
                },
                {
                    "name": "Gemini Image",
                    "type": "multipleAttachments",
                    "description": "Gemini image attachment"
                },
                {
                    "name": "GPT-4o Image",
                    "type": "multipleAttachments",
                    "description": "GPT-4o comparison attachment"
                },
                {
                    "name": "Reference Required",
                    "type": "checkbox",
                    "description": "Whether a reference image is needed"
                },
                {
                    "name": "Reference Note",
                    "type": "multilineText",
                    "description": "Instructions for reference image"
                },
                {
                    "name": "Tags",
                    "type": "singleLineText",
                    "description": "Comma-separated tags"
                },
                {
                    "name": "Category",
                    "type": "singleSelect",
                    "options": {
                        "choices": [
                            {"name": "Portrait & Character", "color": "blueLight2"},
                            {"name": "Product & Mockup", "color": "cyanLight2"},
                            {"name": "Style Transfer", "color": "tealLight2"},
                            {"name": "Scene & Environment", "color": "greenLight2"},
                            {"name": "Icon & Logo", "color": "yellowLight2"},
                            {"name": "Creative Art", "color": "orangeLight2"},
                            {"name": "Miniature & Toy", "color": "redLight2"},
                            {"name": "Text & Typography", "color": "pinkLight2"},
                            {"name": "Food & Object", "color": "purpleLight2"},
                            {"name": "General", "color": "grayLight2"}
                        ]
                    },
                    "description": "Content category"
                },
                {
                    "name": "Scraped At",
                    "type": "dateTime",
                    "options": {
                        "dateFormat": {"name": "iso"},
                        "timeFormat": {"name": "24hour"},
                        "timeZone": "utc"
                    },
                    "description": "When this record was scraped"
                }
            ],
            "views": [
                {
                    "name": "All Cases",
                    "type": "grid"
                },
                {
                    "name": "By Category",
                    "type": "grid",
                    "groupBy": "Category"
                },
                {
                    "name": "Gallery View",
                    "type": "gallery",
                    "coverField": "Gemini Image"
                },
                {
                    "name": "Reference Required",
                    "type": "grid",
                    "filter": {"Reference Required": True}
                }
            ]
        },
        {
            "name": "Tags",
            "description": "Tag taxonomy for organizing prompts",
            "fields": [
                {"name": "Tag Name", "type": "singleLineText"},
                {"name": "Tag Category", "type": "singleSelect", "options": {
                    "choices": [
                        {"name": "Style", "color": "blueLight2"},
                        {"name": "Theme", "color": "greenLight2"},
                        {"name": "Aesthetic", "color": "purpleLight2"},
                        {"name": "Technique", "color": "orangeLight2"}
                    ]
                }},
                {"name": "Description", "type": "multilineText"},
                {"name": "Example Prompt", "type": "multilineText"},
                {"name": "Usage Count", "type": "number"}
            ]
        },
        {
            "name": "Sources",
            "description": "GitHub repositories being scraped",
            "fields": [
                {"name": "Repository", "type": "singleLineText"},
                {"name": "Owner", "type": "singleLineText"},
                {"name": "URL", "type": "url"},
                {"name": "Last Scraped", "type": "dateTime"},
                {"name": "Total Cases", "type": "number"},
                {"name": "Status", "type": "singleSelect", "options": {
                    "choices": [
                        {"name": "Active", "color": "greenLight2"},
                        {"name": "Inactive", "color": "grayLight2"},
                        {"name": "Error", "color": "redLight2"}
                    ]
                }}
            ]
        }
    ]
}


def main():
    # Output schema as JSON
    print("Airtable Schema for Nano Banana Library")
    print("=" * 50)
    print(json.dumps(SCHEMA, indent=2))
    
    # Save to file
    with open('airtable_schema.json', 'w') as f:
        json.dump(SCHEMA, f, indent=2)
    print("\nSaved to airtable_schema.json")
    
    # Print field creation guide
    print("\n" + "=" * 50)
    print("MANUAL FIELD CREATION GUIDE")
    print("=" * 50)
    
    for table in SCHEMA["tables"]:
        print(f"\n📋 Table: {table['name']}")
        print("-" * 40)
        for field in table["fields"]:
            field_type = field["type"]
            type_display = {
                "singleLineText": "Single line text",
                "multilineText": "Long text",
                "number": "Number",
                "url": "URL",
                "checkbox": "Checkbox",
                "singleSelect": "Single select",
                "multipleAttachments": "Attachment",
                "dateTime": "Date"
            }.get(field_type, field_type)
            
            print(f"  • {field['name']} ({type_display})")
            
            if field_type == "singleSelect" and "options" in field:
                choices = [c["name"] for c in field["options"].get("choices", [])]
                if choices:
                    print(f"    Options: {', '.join(choices)}")


if __name__ == "__main__":
    main()
