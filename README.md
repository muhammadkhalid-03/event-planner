# Event Planner App

A Next.js web application with TailwindCSS that provides an intelligent Activity Planner for creating personalized event suggestions. Users can enter their starting location, time constraints, group size, and event preferences to receive AI-powered planning assistance.

## Features

- **Activity Planner**: Intelligent event planning with customizable parameters
- **Smart Place Type Selection**: AI analyzes event descriptions to select from 96+ venue categories
- **Google Places Autocomplete**: Real-time location search and validation
- **Event Customization**: Hour range, group size, age range, budget, and event theme specification
- **AI-Powered Suggestions**: Personalized event recommendations with contextual venue matching
- Modern, responsive UI built with TailwindCSS
- Form validation for required fields
- Google Maps integration with starting location display
- Real-time location preview on interactive map
- TypeScript support for type safety
- Beautiful gradient background design
- Side navigation with animated icons
- **✅ Updated to use Google Maps Advanced Markers (non-deprecated)**

## Recent Updates

### Removed "Select a Business" Popup (Latest)
- **🚫 Cleaner Interface**: Removed the persistent "Select a Business" popup that appeared at the bottom of the screen
- ✅ **Conditional Rendering**: RouteSelector component now only appears when a business/location is actually selected
- ✅ **Removed Persistent Bar**: Eliminated the always-visible summary bar asking users to "Select a location to view more information"
- ✅ **Simplified User Experience**: Users no longer see empty popup prompts when no location is selected
- ✅ **Cleaner Code**: Removed unnecessary conditional checks since component only renders with valid selected locations

### Fixed Dynamic Place Type Implementation
- **🔧 Critical Bug Fix**: Fixed hardcoded place type limitation that was ignoring Gemini's AI selections
- ✅ **True Dynamic Categorization**: Places stored in API logs now reflect the actual place types selected by Gemini AI
- ✅ **Eliminated Hardcoded Restrictions**: Removed forced categorization into only "restaurant", "park", and "club"
- ✅ **Full Place Type Support**: System now properly uses all 96+ Google Places API categories as selected by AI
- ✅ **Improved Route Strategies**: All three route filtering strategies now work with dynamic place types
- ✅ **Enhanced Fallback Planning**: Fallback plan generator now dynamically groups places by their actual types
- ✅ **Accurate Data Storage**: API logs correctly store and categorize places based on AI-selected types
- ✅ **Consistent Event Planning**: Event plans now genuinely reflect the venue types most relevant to your event description
- ✅ **Fixed All Fallback Scenarios**: Removed restaurant-heavy defaults from all error handling scenarios
- ✅ **Better Error Logging**: Enhanced debugging to identify exactly when and why fallbacks occur
- ✅ **Diverse Default Types**: Changed all fallback defaults to use tourist_attraction/park/museum for more balanced results

### Enhanced Route Editing with Massive Variety & Smart Selection (Latest)
- **🚀 Comprehensive Overhaul**: Route regeneration now provides extensive variety instead of cycling between 2 locations
- ✅ **Intelligent Candidate Selection**: Multi-tier selection system prioritizes same type → related types → highly-rated alternatives
- ✅ **Randomized Top Picks**: Randomly selects from top 5-10 candidates instead of always picking highest rated
- ✅ **Expanded Search Pool**: Automatically tries API logs when <15 alternatives found instead of waiting for zero
- ✅ **Broader Fallback Search**: Doubles search radius and includes common venue types when options are limited
- ✅ **Enhanced API Logs Mining**: Checks 10 recent files (up from 5) and finds up to 25 alternatives (up from 10)
- ✅ **Flexible Type Matching**: Accepts exact matches, highly-rated places (4+ stars), OR common venue types
- ✅ **Distance Expansion**: API logs fallback searches up to 3x original radius for maximum variety
- ✅ **Smart Add-Point Logic**: Prioritizes underrepresented place types to balance route composition
- ✅ **Comprehensive Deduplication**: Prevents ALL route duplicates while maintaining extensive alternative pools
- ✅ **Performance Balanced**: Optimized to provide variety without overwhelming API calls

### Fixed Route Editing to Respect AI Place Type Selection
- **🔧 Critical Bug Fix**: Route regeneration and add point features now respect Gemini's initial place type selections
- ✅ **Consistent Categorization**: Regenerate button now searches within the same AI-selected venue categories
- ✅ **Smart New Point Addition**: Add point feature uses the original event-specific place types selected by Gemini
- ✅ **Eliminated Hardcoded Defaults**: Removed hardcoded "restaurant, park, night_club" fallbacks in editing features
- ✅ **Enhanced Type Safety**: Updated TypeScript interfaces to include selectedPlaceTypes in route metadata
- ✅ **Frontend-Backend Consistency**: API calls now pass original place type selections from frontend to backend
- ✅ **Intelligent Fallbacks**: Graceful handling when selectedPlaceTypes are unavailable with appropriate defaults
- ✅ **Improved Debugging**: Added logging to show which place types are being used for regeneration/addition
- ✅ **Complete Route Integrity**: All route modifications maintain the event's original theme and venue categories

### Multiple Routes Generation with AI Place Type Selection
- **🛣️ Multiple Route Options**: Generate 3 different route plans with varying strategies for the same event
- ✅ **AI-Powered Place Selection**: Each route uses the same intelligent place type selection based on event description
- ✅ **Diverse Route Strategies**: 
  - Premium Experience (high-rated venues)
  - Diverse Adventure (mixed place types)
  - Budget-Friendly (lower cost options)
- ✅ **Consistent Place Categories**: All routes use the same AI-selected venue categories for consistency
- ✅ **Enhanced Variety**: Multiple filtering approaches create distinct experiences while maintaining event relevance
- ✅ **Comparative Planning**: Users can compare different approaches to the same event theme

### Automatic Map Updates for Starting Location
- **🗺️ Real-time Map Updates**: Map automatically centers and updates when a new starting location is selected
- ✅ **Instant Visual Feedback**: Map immediately pans to the new location with optimal zoom level (14x)
- ✅ **Starting Location Marker**: Green circular marker clearly identifies your chosen starting point on the map
- ✅ **Seamless Integration**: Uses shared store state to sync location input with map display in real-time
- ✅ **Enhanced Navigation**: Users can immediately see their starting location context before planning events

### Updated Plan Output Messaging and Formatting
- **📝 Improved Plan Text Structure**: Updated LLM prompts to follow specific messaging requirements
- ✅ **Evening Events Focus**: Plans now start with a description specifically about evening events
- ✅ **Clear Plan Options**: Updated ending message to inform users they have 3 different plans that can be edited
- ✅ **Additional Plans Available**: Plans now mention that more plans can be generated if needed
- ✅ **No Markdown Formatting**: Removed all hashtags, asterisks, and markdown formatting from all plan generation endpoints
- ✅ **Consistent Experience**: Applied formatting changes to single plans, multiple routes, and event creation APIs
- ✅ **TypeScript Fixes**: Resolved linter errors for better code quality and type safety

### AI Place Type Selection Fix (Latest)
- **🔧 Critical Fix**: Fixed Gemini JSON parsing to ensure ONLY AI-selected place types are used in searches
- ✅ **Markdown JSON Support**: Added parsing for Gemini responses wrapped in ```json code blocks
- ✅ **Exact Category Matching**: System now searches Google Places API for ONLY the AI-selected categories
- ✅ **No Default Contamination**: Eliminated unwanted restaurant/bar/park defaults when specific categories are requested
- ✅ **Enhanced Logging**: Added comprehensive logging to track exactly which place types are being searched
- ✅ **Temple Example**: Fixed issue where requesting "only temples" was still returning restaurants and bars
- ✅ **Pure AI Selection**: Event plans now strictly respect AI-analyzed place type preferences
- ✅ **Strict Validation**: Added filtering to ensure only requested place types are included in results
- ✅ **Better Error Messages**: Enhanced error handling when no places of requested types are found
- ✅ **Both Endpoints**: Applied fixes to both single event plan and multiple routes generation
- ✅ **Anti-Creative Mode**: Added strict instructions to prevent Gemini from interpreting parks as temples

### Merge Conflict Resolution 
- **🔧 Critical Fix**: Resolved merge conflicts in `generate-event-plan/route.ts` causing TypeScript compilation errors
- ✅ **Clean Build**: Eliminated all merge conflict markers and syntax errors
- ✅ **Function Accessibility**: Fixed undefined function errors for `selectPlaceTypesWithGemini` and `extractLocationsFromPlan`
- ✅ **Consistent Defaults**: Standardized all fallback place types to use diverse categories (tourist_attraction, park, museum)
- ✅ **Template Literal Fixes**: Corrected broken string concatenation in fallback plan generation
- ✅ **Code Quality**: Removed duplicate code blocks and ensured proper TypeScript compliance

### Default Map Location Set to New York City
- **🗽 NYC Default View**: Google Maps now defaults to New York City when first loading the website
- ✅ **Consistent Starting Point**: Map centers on Manhattan (40.7128, -74.006) with zoom level 12
- ✅ **Enhanced User Experience**: Users immediately see a recognizable location instead of a blank or random map area
- ✅ **Coordinates Alignment**: Matches the default starting location coordinates used in the Activity Planner form

### Intelligent Place Type Selection (Now Fully Functional)
- **🧠 AI-Powered Category Selection**: Gemini AI dynamically selects the most relevant place types based on your event description
- ✅ **Smart Event Analysis**: System analyzes event themes to choose from 96+ place categories including restaurants, museums, parks, entertainment venues, shopping, wellness, and more
- ✅ **Contextual Matching**: Automatically adapts place search based on event type (romantic dates, family outings, business events, cultural activities, etc.)
- ✅ **Intelligent Filtering**: Considers age appropriateness, event theme, and activity preferences for optimal venue selection
- ✅ **Fallback Protection**: Robust error handling ensures system works even if AI selection fails
- ✅ **Enhanced Relevance**: Dramatically improves event plan quality by targeting specific venue types for each event
- ✅ **Multiple Route Support**: AI place type selection works for both single event plans and multiple route generation
- ✅ **Fixed Implementation**: System now properly uses AI-selected categories instead of defaulting to restaurants/parks/clubs

### Complete Event Planning Automation
- **Fully Automated Event Planning Workflow** - Single-click comprehensive event planning
- ✅ **Places API Integration**: Automatically searches for restaurants, parks, and bars within user-specified radius
- ✅ **JSON Data Storage**: Saves all found places to timestamped JSON files in `api_logs` directory
- ✅ **Gemini AI Analysis**: Processes places data with user inputs (hour range, people count, event description) to generate personalized event plans
- ✅ **Real-time Plan Display**: Shows AI-generated event plan in Suggested Plan textarea
- ✅ **Interactive Map Integration**: Displays planned locations as markers on Google Maps with click interactions
- ✅ **Error Handling**: Comprehensive error handling with user-friendly messages
- ✅ **Loading States**: Real-time feedback during plan generation process
- ✅ **Workflow API**: New `/api/generate-event-plan` endpoint that orchestrates the entire process

### Activity Planner Interface Features
- **Redesigned Activity Planner sidebar** with comprehensive event planning form
- ✅ Starting Location with Google Places autocomplete
- ✅ Hour Range field for time-based event planning (1-24 hours)
- ✅ Number of People field for group size customization (1-100 people)
- ✅ Radius field for defining search area around starting location (100-5000m, default: 1000m)
- ✅ Event Description textarea for theme and activity preferences
- ✅ Suggested Plan display area showing AI-generated recommendations
- ✅ "Plan" button triggers complete automated workflow
- ✅ Form validation and error handling
- ✅ Loading states and progress indicators

### Google Maps Directions API Waypoints Fix
- **Fixed InvalidValueError when clicking "Show Street View"** after entering two locations
- ✅ Sanitized waypoints array before passing to Google Maps Directions API
- ✅ Removed `id` and `title` properties from API waypoints (kept for local state management)
- ✅ Added filtering to ensure only valid locations are included in waypoints
- ✅ Maintained marker functionality while fixing API compatibility

### Google Maps Marker Migration (Completed)
- **Migrated from deprecated `google.maps.Marker`** (deprecated as of February 21st, 2024) to **`google.maps.marker.AdvancedMarkerElement`**
- ✅ Added required `mapId: "DEMO_MAP_ID"` to map initialization
- ✅ Created custom `AdvancedMarker` component with proper lifecycle management
- ✅ Implemented marker library loading in GoogleMapsContext
- ✅ Enhanced markers with titles and click interactions
- ✅ Maintained full backward compatibility with existing functionality

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- npm or yarn package manager
- Google Maps API key with Street View enabled

### Setup Google Maps API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Street View Static API
   - Geocoding API
   - **Places API** (for advanced place search functionality)
4. Create credentials (API key)
5. Create a `.env.local` file in the root directory and add your API key:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

**Important:** After creating/updating the `.env.local` file, restart your development server with `npm run dev` for the environment variables to take effect.

### Recent Updates & Fixes

#### Event Planning Data Flow Fix (Latest)
- **Fixed "AVAILABLE PLACES DATA field is empty" Error** - Resolved issue where AI wasn't receiving places data properly
- ✅ **Enhanced Debugging**: Added comprehensive logging throughout the event planning workflow
- ✅ **Fallback Mechanism**: System now uses original places data if AI filtering removes all venues
- ✅ **Better Error Handling**: Improved error messages and API key validation
- ✅ **Robust Data Flow**: Event planning now works reliably even with missing API keys or filtering issues

#### Troubleshooting Event Planning Issues
If you encounter "no place data provided" errors:
1. **Check API Keys**: Ensure both `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `GEMINI_API_KEY` are configured in `.env.local`
2. **Check Console Logs**: Look for detailed debugging output in both browser console and terminal
3. **Verify Location**: Ensure the starting location has nearby venues within the specified radius
4. **Restart Server**: After updating `.env.local`, restart with `npm run dev`

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── components/
│   │   ├── LocationForm.tsx      # Location input form with autocomplete
│   │   ├── MapView.tsx          # Google Maps with Advanced Markers
│   │   ├── PlacesSearch.tsx     # Places API search functionality
│   │   ├── RestaurantAnalyzer.tsx # AI-powered restaurant analysis
│   │   └── Navbar.tsx           # Side navigation component
│   ├── contexts/
│   │   └── GoogleMapsContext.tsx # Google Maps API loading with marker library
│   ├── api/
│   │   ├── mapServices.ts       # Route computation services
│   │   ├── analyze-restaurants/ # AI restaurant analysis endpoint
│   │   ├── create-event-plan/   # Event planning API
│   │   └── save-places/         # Places data management
│   ├── hooks/
│   │   └── usePlacesSearch.tsx  # Custom hook for Places API
│   ├── globals.css              # Global styles with TailwindCSS
│   ├── layout.tsx               # Root layout component
│   └── page.tsx                 # Home page
├── package.json
├── tailwind.config.js           # TailwindCSS configuration
├── postcss.config.js            # PostCSS configuration
└── tsconfig.json                # TypeScript configuration
```

## Activity Planner Form Fields

The Activity Planner includes the following input fields:

1. **Starting Location** - Enter your starting location with Google Places autocomplete
2. **Hour Range** - Specify how many hours you have available for your event (1-24 hours)
3. **Number of People** - Enter the number of people attending (1-100 people)
4. **Radius (meters)** - Define the search area around your starting location (100-5000 meters, default: 1000m)
5. **Description of Event** - Describe your event theme or preferred activities
6. **Suggested Plan** - Displays AI-generated event suggestions (read-only)

All fields are required except the suggested plan. Upon clicking "Plan", the application executes a comprehensive automated workflow:

## Automated Event Planning Workflow

When you click the "Plan" button, the system performs the following automated steps:

### 1. Intelligent Place Type Selection 🧠
- **AI-Powered Category Selection**: Gemini AI analyzes your event description to select the most relevant place types
- **Smart Matching**: Chooses 3-5 place categories from 96+ available types based on your event theme
- **Examples**: 
  - "romantic date night" → restaurants, parks, art galleries, movie theaters, bars
  - "kids birthday party" → amusement parks, restaurants, parks, zoos, bowling alleys
  - "business networking" → restaurants, bars, art galleries, museums
  - "cultural exploration" → museums, art galleries, tourist attractions, libraries, restaurants

### 2. Places Discovery 🔍
- Uses Google Places API to search for AI-selected place types within your specified radius
- Searches multiple relevant categories simultaneously to ensure variety and relevance
- Retrieves detailed information including ratings, addresses, photos, and amenities
- Adapts search strategy based on your specific event needs

### 3. Data Storage 💾
- Saves all discovered places to a timestamped JSON file in the `api_logs` directory
- Includes comprehensive metadata: search parameters, location coordinates, and event requirements
- Creates a permanent record for analysis and debugging

### 4. AI Event Planning 🤖
- Sends the places data along with your event parameters to Gemini AI
- AI analyzes all available venues considering:
  - Your event description and preferences
  - Time constraints (hour range)
  - Group size requirements
  - Location ratings and suitability
  - Logical travel routes between venues

### 5. Plan Generation 📋
- Gemini creates a detailed, personalized event itinerary
- Includes specific venue recommendations with reasoning
- Provides hour-by-hour timeline
- Suggests optimal travel routes
- Considers group dynamics and event theme

### 6. Interactive Display 🗺️
- Displays the generated plan in the "Suggested Plan" textarea
- Shows planned venue locations as markers on Google Maps
- Enables interactive exploration of suggested venues
- Provides clickable markers with venue details

## Advanced Features

### Google Maps Advanced Markers
- Uses the latest `google.maps.marker.AdvancedMarkerElement` (replaces deprecated Marker class)
- Enhanced customization capabilities
- Improved performance and accessibility
- Support for custom HTML/CSS styling

### Places API Integration
- Real-time place search with multiple place types (restaurants, parks, entertainment)
- Detailed place information including ratings, reviews, photos
- Radius-based search functionality
- Custom place categorization and filtering

### AI-Powered Analysis
- Restaurant analysis using Gemini API
- Event planning recommendations
- Intelligent location suggestions

## API Keys Configuration

The application requires two API keys configured in `.env.local`:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: For Google Maps, Places, and Geocoding APIs
- `GEMINI_API_KEY`: For AI-powered restaurant analysis and event planning

## Technologies Used

- [Next.js 14](https://nextjs.org/) - React framework
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [React 18](https://reactjs.org/) - UI library
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview) - Maps and Street View integration
- [@react-google-maps/api](https://react-google-maps-api-docs.netlify.app/) - React Google Maps integration
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service) - Place search and details
- [Google Gemini API](https://ai.google.dev/) - AI-powered analysis and event planning
