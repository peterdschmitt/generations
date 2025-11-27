# Professional Prompt Crafting Guide

## The Director's Mindset

Achieving professional results with Gemini is like being a **film director**, not a casual camera user. You don't just point and shoot—you write a detailed script that specifies:

- **Casting** (Subject Preservation)
- **Set Design** (Environment)
- **Cinematography** (Lighting, Camera, Style)

By providing this structure and high-quality source material, the model delivers polished, production-ready output.

---

## The Five Pillars of Professional Prompts

### 1. Subject Preservation
Define exactly what must remain consistent across all outputs.

```
Key Subjects: "A red 2024 Porsche 911 GT3 RS with black wheels,
a blonde woman in her 30s wearing aviator sunglasses and a white blazer"
```

**Best Practices:**
- Be specific about distinguishing features
- Include colors, materials, and proportions
- Reference the source photos explicitly ("the car shown in the reference images")

---

### 2. Environment & Setting
Establish the world your subjects inhabit.

```
Setting: "Modern downtown Los Angeles at golden hour,
glass skyscrapers reflecting warm sunset light,
palm trees visible in the background"
```

**Components to Define:**
- Location type (urban, nature, studio, abstract)
- Time of day / lighting conditions
- Weather / atmosphere
- Background elements and depth

---

### 3. Camera & Composition
Direct the virtual cinematographer with precision.

| Angle Type | Use Case | Example Prompt |
|------------|----------|----------------|
| **Wide/Establishing** | Scene context | "Wide establishing shot showing the full environment, subject at 1/3 frame" |
| **Medium** | Balance of subject and context | "Medium shot at eye level, subject fills 60% of frame" |
| **Close-up** | Detail and emotion | "Tight close-up on the product, shallow depth of field" |
| **Low Angle** | Power, heroism | "Low angle looking up at subject, dramatic perspective" |
| **High Angle** | Vulnerability, overview | "Bird's eye view, subject centered in frame" |
| **Dutch Angle** | Tension, unease | "15-degree Dutch angle for dynamic tension" |
| **POV** | Immersion | "First-person perspective, as if viewer is the subject" |
| **Over-the-Shoulder** | Relationship, context | "Over-the-shoulder shot revealing what character sees" |

---

### 4. Lighting Design
Light is the language of visual storytelling.

**Three-Point Lighting Framework:**
```
Lighting: "Soft key light from camera-left at 45 degrees,
subtle fill light from right, rim light separating subject from background"
```

**Mood-Based Lighting:**
| Mood | Lighting Setup |
|------|----------------|
| Professional/Corporate | Even, soft lighting, minimal shadows |
| Dramatic/Cinematic | High contrast, strong shadows, motivated light sources |
| Warm/Inviting | Golden hour, warm color temperature |
| Cool/Technical | Blue-tinted, even, clinical |
| Mysterious | Low-key, single source, deep shadows |

---

### 5. Style & Quality Markers
Set the production value and aesthetic tone.

```
Style: "Photorealistic commercial photography,
shot on Hasselblad H6D-100c,
8K resolution, professional color grading"
```

**Quality Indicators:**
- Camera/lens reference (Canon EOS R5, Leica M11, etc.)
- Film stock reference (Kodak Portra 400, Fuji Velvia)
- Resolution markers (8K, cinema quality, print resolution)
- Post-processing style (color graded, film emulation, HDR)

---

## Systematic Workflow for Sequences

### Phase 1: Storyboard Planning
Before generating, plan your sequence:

1. **Define the narrative arc** - What story are you telling?
2. **List required shots** - Wide, medium, close-up, detail
3. **Plan camera movement** - Static, tracking, zoom progression
4. **Map emotional beats** - Each shot should serve a purpose

### Phase 2: Shot-by-Shot Generation

**Shot 1 - Establishing:**
```
Wide establishing shot showing the full scene.
The red Porsche GT3 RS (from reference) is parked on a cliffside road overlooking the ocean.
Golden hour lighting, lens flare from setting sun.
Shot on ARRI Alexa 65, anamorphic lens with subtle blue flare.
```

**Shot 2 - Subject Introduction:**
```
Medium shot, the blonde woman (from reference) approaches the car.
Camera at hip level, tracking slightly as she walks.
Her white blazer catches the warm sunset light.
Shallow depth of field, background softly blurred.
```

**Shot 3 - Detail/Product:**
```
Extreme close-up of the Porsche badge on the hood.
Reflection of the sunset visible in the chrome.
Macro lens detail, every surface imperfection visible.
Cinematic color grade with lifted blacks.
```

### Phase 3: Multi-Image Fusion Order

When combining elements from different sources:

1. **Foundation First** - Generate or establish the background/environment
2. **Subject Integration** - Place primary subjects with proper scale
3. **Lighting Harmonization** - Ensure all elements share consistent light direction
4. **Shadow & Reflection** - Add grounding shadows and surface reflections
5. **Atmospheric Effects** - Add haze, particles, or environmental effects

---

## Prompt Templates

### Template: Product Photography Sequence

```
[SHOT TYPE]: [Wide establishing / Medium / Close-up / Detail]

SUBJECT PRESERVATION:
Maintain exact appearance of [subject] from reference photos.
Key identifying features: [list specific details]

ENVIRONMENT:
[Location], [time of day], [weather/atmosphere]
Background elements: [specific items]

CAMERA:
[Angle] angle, [focal length equivalent]
[Camera movement if any]
Subject positioned at [rule of thirds position]

LIGHTING:
[Key light position and quality]
[Fill and rim as needed]
[Motivated light sources in scene]

STYLE:
[Camera/lens reference]
[Color grade / film stock look]
[Resolution / quality markers]

SPECIFIC INSTRUCTIONS:
[Any unique requirements for this shot]
```

### Template: Cinematic Sequence

```
SCENE [#] OF [TOTAL]: [Scene description]

This is a [shot type] in a [total]-shot cinematic sequence.

CONTINUITY REQUIREMENTS:
- Subject: [exact description from references]
- Environment: [consistent setting details]
- Time: [time of day, maintaining continuity]
- Style: [consistent visual treatment]

CAMERA DIRECTION:
Position: [specific angle and height]
Movement: [static/tracking/push-in/pull-out]
Lens: [focal length, aperture implication]

LIGHTING CONTINUITY:
Sun/key position: [consistent direction]
Quality: [hard/soft, color temperature]
Practical lights: [any in-scene light sources]

EMOTIONAL BEAT:
This shot conveys: [intended emotion/purpose]

TECHNICAL SPECIFICATIONS:
- Aspect ratio: [16:9, 2.39:1, etc.]
- Camera reference: [ARRI, RED, etc.]
- Post style: [color grade description]
```

---

## Common Mistakes to Avoid

| Mistake | Problem | Solution |
|---------|---------|----------|
| Vague subject description | Inconsistent results | Be hyper-specific about key features |
| Ignoring light direction | Unrealistic composites | Always specify light source position |
| Missing scale references | Objects appear wrong size | Include environmental scale cues |
| Generic style requests | Mediocre output | Reference specific cameras, lenses, films |
| No composition guidance | Random framing | Use rule of thirds, specify subject placement |
| Forgetting shadows | Subjects appear floating | Always prompt for realistic grounding shadows |

---

## Quick Reference: Shot List for Common Projects

### Product Launch (6 shots)
1. Hero shot - product isolated, dramatic lighting
2. Environment shot - product in lifestyle context
3. Detail shot - texture and craftsmanship
4. Scale shot - product with human interaction
5. Feature shot - specific capability highlighted
6. Brand shot - product with logo/branding visible

### Character Introduction (4 shots)
1. Establishing - character in their world
2. Medium - character's demeanor and style
3. Close-up - emotional state, facial features
4. Detail - defining accessory or characteristic

### Location Showcase (5 shots)
1. Wide aerial/establishing
2. Ground-level perspective
3. Architectural detail
4. Human scale reference
5. Golden hour/atmospheric mood

---

## Advanced Technique: Iterative Refinement

1. **Generate initial sequence** with baseline prompts
2. **Identify strongest frame** from results
3. **Upload that frame** as new reference
4. **Generate variations** maintaining its style
5. **Regenerate weak frames** using strong frame as style anchor

This creates internal consistency while elevating overall quality.

---

*Remember: The model is your production house. You are the director. The more detailed your creative brief, the closer the output matches your vision.*
