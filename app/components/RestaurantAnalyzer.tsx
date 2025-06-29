'use client';

import { useState, useEffect } from 'react';

interface AnalysisResult {
  success: boolean;
  result?: string;
  restaurantCount?: number;
  error?: string;
}

export default function RestaurantAnalyzer() {
  const [task, setTask] = useState('');
  const [fileName, setFileName] = useState('');
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const predefinedTasks = [
    'Find the top 5 highest-rated restaurants and explain why they stand out',
    'Identify restaurants that serve vegetarian food and group them by cuisine type',
    'Analyze pricing patterns and identify budget-friendly options under $20',
    'Find restaurants within 2 miles of downtown and rank them by rating',
    'Suggest the best restaurants for different occasions (romantic dinner, family meal, business lunch)',
    'Identify any restaurants with consistently negative reviews and suggest improvements'
  ];

  // Load available restaurant files on component mount
  useEffect(() => {
    const fetchAvailableFiles = async () => {
      try {
        const response = await fetch('/api/list-restaurant-files');
        if (response.ok) {
          const data = await response.json();
          setAvailableFiles(data.files || []);
          if (data.files && data.files.length > 0) {
            setFileName(data.files[0]); // Set the most recent file as default
          }
        }
      } catch (error) {
        console.error('Failed to fetch available files:', error);
        // Set a default filename pattern
        setFileName('restaurants.json');
      }
    };
    
    fetchAvailableFiles();
  }, []);

  const handleAnalyze = async () => {
    if (!task.trim()) {
      alert('Please enter a task or select a predefined one');
      return;
    }

    if (!fileName.trim()) {
      alert('Please specify a restaurant data file');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/analyze-restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task,
          fileName,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to analyze restaurants'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
        🤖 Restaurant Data Analyzer <span className="text-sm font-normal text-gray-500 ml-2">(Powered by DeepSeek)</span>
      </h2>

      {/* File Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Restaurant Data File:
        </label>
        {availableFiles.length > 0 ? (
          <select
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {availableFiles.map((file) => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="restaurants-1751224821560.json"
          />
        )}
      </div>

      {/* Predefined Tasks */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Tasks:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {predefinedTasks.map((predefinedTask, index) => (
            <button
              key={index}
              onClick={() => setTask(predefinedTask)}
              className="text-left p-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm transition-colors border border-gray-200"
            >
              {predefinedTask}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Task Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Analysis Task:
        </label>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
          placeholder="Enter your analysis task here... (e.g., 'Find the best Italian restaurants with outdoor seating')"
        />
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={loading || !task.trim() || !fileName.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
      >
        {loading ? 'Analyzing...' : 'Analyze with DeepSeek'}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          {result.success ? (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-green-600">
                  ✅ Analysis Complete
                </h3>
                <span className="text-sm text-gray-600">
                  {result.restaurantCount} restaurants analyzed
                </span>
              </div>
              <div className="bg-white p-4 rounded border">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {result.result}
                </pre>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                ❌ Analysis Failed
              </h3>
              <p className="text-red-500">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 