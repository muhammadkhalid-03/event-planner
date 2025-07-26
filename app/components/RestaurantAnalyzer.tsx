'use client';

import { useState, useEffect } from 'react';

interface EventPlanResult {
  success: boolean;
  result?: string;
  placeCount?: number;
  restaurantCount?: number; // Keep for backward compatibility
  error?: string;
}

export default function EventPlanner() {
  const [customTask, setCustomTask] = useState('');
  const [fileName, setFileName] = useState('');
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [result, setResult] = useState<EventPlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Event planning specific fields
  const [numberOfLocations, setNumberOfLocations] = useState(3);
  const [timeDuration, setTimeDuration] = useState('4 hours');
  const [eventType, setEventType] = useState('general');
  const [groupSize, setGroupSize] = useState('2-4 people');
  const [budget, setBudget] = useState('moderate');

  const eventTypes = [
    'general',
    'romantic-date',
    'family-outing',
    'friends-hangout',
    'business-event',
    'tourist-visit',
    'birthday-celebration',
    'first-date',
    'group-celebration'
  ];

  const timeDurations = [
    '2 hours',
    '4 hours',
    '6 hours',
    '8 hours',
    'Half day (4-6 hours)',
    'Full day (8+ hours)',
    'Weekend (2 days)',
    'Custom duration'
  ];

  const budgetOptions = [
    'budget-friendly',
    'moderate',
    'upscale',
    'luxury',
    'mixed-budget'
  ];

  const groupSizes = [
    '1 person',
    '2-4 people',
    '5-8 people',
    '9-15 people',
    '16+ people'
  ];

  const predefinedEventPlans = [
    'Perfect romantic evening with dinner and scenic spots',
    'Family-friendly day out with parks, restaurants, and activities',
    'Night out with friends including dinner, drinks, and entertainment',
    'Business event plan with professional dining and networking venues',
    'Tourist itinerary showcasing the best local attractions and dining',
    'Birthday celebration plan with venues for different age groups',
    'First date plan with comfortable, conversation-friendly locations',
    'Weekend getaway plan with diverse activities and dining options',
    'Group celebration with venues that can accommodate large parties',
    'Local food tour with highly-rated restaurants and unique dining experiences'
  ];

  // Load available place files on component mount
  useEffect(() => {
    const fetchAvailableFiles = async () => {
      try {
        // First try to get all place files from the api_logs directory
        const response = await fetch('/api/list-place-files');
        if (response.ok) {
          const data = await response.json();
          setAvailableFiles(data.files || []);
          if (data.files && data.files.length > 0) {
            setFileName(data.files[0]); // Set the most recent file as default
          }
        }
      } catch (error) {
        console.error('Failed to fetch available files:', error);
        // Fallback to restaurant files if place files API doesn't exist yet
        try {
          const response = await fetch('/api/list-restaurant-files');
          if (response.ok) {
            const data = await response.json();
            setAvailableFiles(data.files || []);
            if (data.files && data.files.length > 0) {
              setFileName(data.files[0]);
            }
          }
        } catch (fallbackError) {
          console.error('Failed to fetch restaurant files as fallback:', fallbackError);
          setFileName('places.json');
        }
      }
    };
    
    fetchAvailableFiles();
  }, []);

  const generateEventPlan = async () => {
    if (!fileName.trim()) {
      alert('Please select a place data file');
      return;
    }

    setLoading(true);
    setResult(null);

    // Create a comprehensive event planning prompt
    const eventPlanningPrompt = customTask.trim() || 
      `Create an ideal ${eventType.replace('-', ' ')} event plan for ${groupSize} with a ${budget} budget lasting ${timeDuration}. 
      Plan should include ${numberOfLocations} locations using the available places data. 
      Consider travel time between locations, operating hours, and create a logical flow for the event.
      
      Requirements:
      - Event type: ${eventType.replace('-', ' ')}
      - Duration: ${timeDuration}
      - Number of locations: ${numberOfLocations}
      - Group size: ${groupSize}
      - Budget: ${budget}
      
      Please provide:
      1. A detailed itinerary with specific times
      2. Reasons for each location choice
      3. Estimated costs where applicable
      4. Travel considerations and logistics
      5. Alternative options if primary choices are unavailable
      
      Make the plan practical and enjoyable!`;

    try {
      // Try the new event planning API first, fallback to existing analyzers
      let response;
      try {
        response = await fetch('/api/create-event-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task: eventPlanningPrompt,
            fileName,
            eventDetails: {
              eventType,
              numberOfLocations,
              timeDuration,
              groupSize,
              budget
            }
          }),
        });
      } catch (error) {
        // Fallback to existing API endpoints
        response = await fetch('/api/analyze-places', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task: eventPlanningPrompt,
            fileName,
          }),
        });
      }

      if (!response.ok) {
        // Final fallback to restaurant analyzer
        response = await fetch('/api/analyze-restaurants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task: eventPlanningPrompt,
            fileName,
          }),
        });
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to create event plan'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center">
        🎯 AI Event Planner <span className="text-sm font-normal text-gray-500 ml-2">(Powered by Gemini)</span>
      </h2>

      {/* File Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📁 Select Place Data File:
        </label>
        {availableFiles.length > 0 ? (
          <select
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Select a data file...</option>
            {availableFiles.map((file) => (
              <option key={file} value={file}>
                📄 {file}
              </option>
            ))}
          </select>
        ) : (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">
              ⚠️ No place data files found. Please search for places first using the Places Search page.
            </p>
          </div>
        )}
      </div>

      {/* Event Planning Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🎭 Event Type:
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ⏱️ Duration:
          </label>
          <select
            value={timeDuration}
            onChange={(e) => setTimeDuration(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {timeDurations.map((duration) => (
              <option key={duration} value={duration}>
                {duration}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 Number of Locations:
          </label>
          <select
            value={numberOfLocations}
            onChange={(e) => setNumberOfLocations(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <option key={num} value={num}>
                {num} location{num !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            👥 Group Size:
          </label>
          <select
            value={groupSize}
            onChange={(e) => setGroupSize(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {groupSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💰 Budget:
          </label>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {budgetOptions.map((option) => (
              <option key={option} value={option}>
                {option.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Predefined Event Plans */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🎯 Quick Event Plan Templates:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {predefinedEventPlans.map((plan, index) => (
            <button
              key={index}
              onClick={() => setCustomTask(plan)}
              className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-md text-sm transition-colors border border-gray-200"
            >
              {plan}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Event Plan Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ✍️ Custom Event Plan Description:
        </label>
        <textarea
          value={customTask}
          onChange={(e) => setCustomTask(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
          placeholder="Describe your ideal event... (e.g., 'Plan a romantic anniversary dinner with scenic spots and a cozy atmosphere')"
        />
      </div>

      {/* Create Event Plan Button */}
      <button
        onClick={generateEventPlan}
        disabled={loading || !fileName.trim()}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-4 px-6 rounded-md transition-all duration-200 text-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating Your Event Plan...
          </span>
        ) : (
          '🎯 Create My Event Plan'
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          {result.success ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-green-600 flex items-center">
                  ✅ Your Event Plan is Ready!
                </h3>
                <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
                  📍 {result.placeCount || result.restaurantCount || 'Multiple'} locations analyzed
                </span>
              </div>
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-gray-800 font-sans leading-relaxed">
                    {result.result}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-bold text-red-600 mb-3 flex items-center">
                ❌ Event Planning Failed
              </h3>
              <p className="text-red-600 bg-red-50 p-4 rounded-md">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 