# Update June 21st 2025
Working Search Nearby Places API request with restaurants.
It's put on another page: /places


# Location Finder App

A Next.js web application with TailwindCSS that allows users to enter their country, city, and specific location within that city, and view the location in Google Street View.

## Features

- Modern, responsive UI built with TailwindCSS
- Form validation for required fields
- Google Maps Street View integration
- Real-time location preview
- TypeScript support for type safety
- Beautiful gradient background design
- Side navigation with animated icons

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
4. Create credentials (API key)
5. Create a `.env.local` file in the root directory and add your API key:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

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
│   │   ├── LocationForm.tsx    # Location input form
│   │   ├── MapView.tsx        # Google Maps Street View component
│   │   └── Navbar.tsx         # Side navigation component
│   ├── globals.css            # Global styles with TailwindCSS
│   ├── layout.tsx             # Root layout component
│   └── page.tsx               # Home page
├── package.json
├── tailwind.config.js         # TailwindCSS configuration
├── postcss.config.js          # PostCSS configuration
└── tsconfig.json              # TypeScript configuration
```

## Form Fields

The application includes three input fields:

1. **Country** - Enter your country name
2. **City** - Enter your city name
3. **Specific Location** - Enter a neighborhood, landmark, or specific address

All fields are required and include proper validation. Upon submission, the application will:

1. Geocode the entered address
2. Load the Street View for the location
3. Display an error message if Street View is not available

## Technologies Used

- [Next.js 14](https://nextjs.org/) - React framework
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [React 18](https://reactjs.org/) - UI library
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview) - Maps and Street View integration
