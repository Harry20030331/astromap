# AstraMap — Product Requirements Document (PRD)

## 1. Overview

**AstraMap** is a mobile-first, AI-assisted workspace designed for astrologers.  
It helps practitioners transform complex natal chart data into structured insights and supports real-time, question-driven interpretation during client sessions.

Unlike consumer astrology apps, AstraMap is **not designed for end users**, but rather as a **professional assistant tool** that enhances the astrologer’s workflow.

---

## 2. Product Vision

> Enable astrologers to move from raw chart complexity to meaningful human conversation — faster, clearer, and more structured.

AstraMap does **not replace the astrologer**.  
Instead, it:

- Reduces cognitive load
- Surfaces key structural patterns
- Assists in generating meaningful inquiry directions
- Supports human-to-human emotional interaction

---

## 3. Target Users

### Primary User
- Practicing astrologers (including semi-professional or hobbyist practitioners)

### Usage Context
- During live reading sessions
- Preparing for a reading
- Exploring a chart interactively

### Non-Goals
- Not a consumer astrology app
- Not a daily horoscope product
- Not a fully automated interpretation system

---

## 4. Core Principles

1. **AI as Assistant, not Authority**
   - AI suggests, not concludes

2. **Structure before Narrative**
   - Extract symbolic structure first, interpret later

3. **Human-Centered Interpretation**
   - Final meaning-making happens between astrologer and client

4. **Minimal but Insightful**
   - Provide hints, not overwhelming explanations

---

## 5. Product Scope

### In Scope (MVP)

- Natal chart visualization
- Structured feature extraction
- Theme hint generation
- Query-based interpretation support
- Mobile-first interface

### Out of Scope (MVP)

- User authentication system
- Social/sharing features
- Daily horoscope / push content
- Long-term memory or user profiles at scale
- App Store deployment

---

## 6. System Architecture

### 6.1 Pipeline Overview

The system follows a hybrid architecture combining deterministic symbolic computation with AI-based interpretation:

```
Birth Data
→ Chart Generation (Deterministic)
→ Structured Feature Extraction (Tools)
→ Theme Extraction (LLM)
→ Query-based Interpretation (LLM + Tools)
→ Mobile Interface (View / Query Modes)
```

---

### 6.2 Architecture Philosophy

AstraMap separates the system into two fundamentally different layers:

1. **Symbolic Layer (Deterministic)**
   - Handles all computable, rule-based astrology logic
   - Ensures stability, interpretability, and consistency

2. **Interpretation Layer (AI-driven)**
   - Handles abstraction, pattern synthesis, and language generation
   - Produces human-readable insights and inquiry directions

This separation prevents the system from becoming a simple LLM wrapper and ensures meaningful system design.

**View mode is hybrid, not purely algorithmic:** chart geometry and structured features are tool-derived; concise theme synthesis (§7.3) may use an LLM and appear in View as short, collapsible hints. Query mode remains for deeper, question-driven interpretation.

---

## 7. Functional Components

### 7.1 Chart Computation Layer (Deterministic)

**Input**

- Birth date
- Birth time
- Birth location

**Output**

- Planetary positions
- Zodiac signs
- Houses
- Aspects (with orb calculations)
- Enough structure for **per-body** and **per-house** drill-down in the UI (placements, cusps, rulers)

This layer relies on existing astrology libraries or APIs.

---

### 7.2 Structured Feature Extraction (Tools Layer)

This layer transforms raw chart data into structured symbolic features.

**Key Features Extracted**

- Element distribution (Fire / Earth / Air / Water)
- Modality distribution (Cardinal / Fixed / Mutable)
- Stellium detection
- House concentration
- Major aspects (filtered by orb strength)
- Dominant planets
- Repeated structural signals

**Example Output**

```json
{
  "elements": {"fire": 4, "earth": 2, "air": 1, "water": 3},
  "modalities": {"cardinal": 5, "fixed": 2, "mutable": 3},
  "stelliums": ["Capricorn stellium in 10th house"],
  "aspects": ["Venus square Saturn", "Moon trine Jupiter"],
  "house_emphasis": ["10th house", "7th house"],
  "dominant_planets": ["Saturn", "Venus"]
}
```

**Design Rationale**

- Reduces cognitive load for astrologers
- Provides clean input for AI layers
- Avoids unnecessary LLM usage

---

### 7.3 Theme Extraction Layer (AI)

This layer synthesizes high-level themes from structured features. Its output can feed **View** (minimal presentation) as well as context for **Query**.

**Input**

- Structured feature output (from tools layer)

**Output**

- 3–5 core themes
- Short interpretation hints
- Suggested reading priorities

**Characteristics**

- Concise and non-authoritative
- Suggestive rather than definitive
- Focused on guiding interpretation, not replacing it

---

### 7.4 Query-Based Interpretation Layer (AI + Tools)

This layer supports astrologer-driven exploration.

**Input**

- User query (keywords, client statements, or themes)
- Structured chart features

**Output**

- Relevant chart structures
- Interpretation hints
- Suggested questions for client dialogue

**Example**

*Query:* "relationship hesitation"

**Relevant Structures**

- Venus square Saturn
- Moon in 7th house

**Interpretation Hints**

- Possible tension between desire for intimacy and fear of vulnerability

**Suggested Questions**

- Do you find yourself holding back emotionally in relationships?
- Is there a recurring hesitation when things become close or serious?

**Design Principle**

- Focus on guiding inquiry, not giving final answers
- Align with real-world astrologer workflow

---

## 8. User Interface Design

### 8.1 Platform

- Mobile-first Web Application (PWA-style)
- Optimized for smartphone usage
- No App Store dependency

### 8.2 Layout Structure

**Top Navigation Bar**

- Switch between chart sessions (clients)
- Create / load charts

### 8.3 Mode 1: View (Presentation Layer)

**Purpose**

- Shared with client
- Displays objective and structured chart information

**Content**

- **Interactive natal chart** (not only a static graphic):
  - **Planet / point tap:** attributes, **sign**, **house**, and **aspects** to other bodies (with orbs)
  - **House tap:** house attributes, **cusp** (sign / longitude), **house ruler(s)** (per chosen rulership scheme)
- **Chart display settings** (e.g., gear icon): toggle **visible bodies** (major planets, **angles**, **sensitive / fictitious points**, **asteroids** / minor bodies); configure **aspect** sets and **orb** tolerances for drawing and labels
- Element distribution
- Modality distribution
- Stelliums / clusters
- Major aspects
- Theme hints (collapsed / minimal)

**Design Principles**

- Clean and readable
- Minimal interpretation
- Focus on clarity and structure
- Structure-first UI: LLM theme hints are brief and secondary to verifiable chart facts

### 8.4 Mode 2: Query (Astrologer Layer)

**Purpose**

- Private workspace for astrologer interaction with AI

**Content**

- Query input field (text)
- Voice input for queries (e.g., dictation / push-to-talk), suitable for hands-busy live sessions
- Suggested topics (e.g., relationship, career)
- AI-generated outputs:
  - Relevant structures
  - Interpretation hints
  - Suggested questions

**Design Principles**

- Fast iteration
- Supports ongoing exploration
- Clearly separated from client-facing content
- Voice and text share the same query pipeline after transcription

---

## 9. Interaction Flow

1. User inputs birth data
2. System generates natal chart
3. Structured features are computed
4. AI extracts core themes
5. View mode displays chart and summaries
6. Astrologer explores chart (bodies, houses, display settings)
7. Astrologer enters a query (text or voice → transcribed text)
8. System returns focused interpretation support
9. Astrologer integrates insights into real conversation

---

## 10. Technology Stack (Suggested)

### Frontend

- React / Next.js
- Mobile-first responsive design
- Speech-to-text for Query mode (browser Web Speech API and/or native OS input, as available)

### Backend

- Python (FastAPI) or Node.js

### AI Layer

- LLM (OpenAI / Anthropic)

### Tools Layer

- Custom symbolic computation functions

### Data Storage

- Local JSON (MVP stage)

---

## 11. Design Decisions

### Tools + AI Hybrid Approach

- Deterministic logic handled by tools
- Interpretive reasoning handled by AI
- Ensures both reliability and flexibility

### Mobile-First Web Strategy

- Faster development cycle
- No platform restrictions
- Ideal for session-based usage

### Structured UI Instead of Chatbot

- Aligns with astrologer workflow
- Prevents unstructured outputs
- Improves interpretability

---

## 12. One-Sentence Summary

AstraMap is a mobile-first AI workspace that helps astrologers transform raw chart data into structured insights and question-driven interpretations, enabling more focused and meaningful human conversations.