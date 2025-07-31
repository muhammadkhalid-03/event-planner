# What's In Town AI

An AI-powered activity planner built with Next.js and TailwindCSS. Users input a starting location, event preferences, and constraints (time, group size, budget) to receive personalized itineraries generated with Gemini AI and Google Maps.

## Access

Use **code `wHQ2:p#$s010`** to access the website.

## Key Features

* Firebase authentication with access code
* AI analyzes event descriptions to select venue types
* Generates 3 unique routes per plan (e.g., budget, premium, diverse)
* Interactive Google Maps with advanced markers
* Real-time place search with Google Places API
* Event customization: hours, radius (10–20,000m), group size, budget, age
* Age filtering (excludes venues like bars if under 21)
* Smart deduplication and budget-aware venue selection
* Structured output with clear timelines and travel estimates

## Major Improvements

* Expanded search radius to 20km
* Fixed hardcoded place type limitations
* Enhanced route variety and fallback strategies
* Removed unnecessary popups and defaults
* Custom favicon and branding updates
* Default map view set to New York City
* Full support for AI-selected venue categories
* Real-time map syncing with user inputs

## Getting Started

### Requirements

* Node.js 18+
* Google Maps & Gemini API keys

### Setup

1. Create a `.env.local`:

   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
   GEMINI_API_KEY=your_key
   ```

2. Install and run:

   ```
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## File Structure (Simplified)

```
app/
  components/     # UI components
  api/            # API endpoints
  contexts/       # Shared contexts
  hooks/          # Custom hooks
  page.tsx        # Homepage
  layout.tsx      # Global layout
globals.css       # Styling
```

## Form Fields

* Starting location (with autocomplete)
* Time range (1–24 hrs)
* Group size (1–100)
* Radius (10–20,000 meters)
* Event description
* Suggested plan (AI-generated)

## Technologies

* Next.js 14, React 18, TailwindCSS
* TypeScript
* Google Maps & Places APIs
* Gemini AI
* Firebase

---

Let me know if you'd like a version with a friendlier or more technical tone.
