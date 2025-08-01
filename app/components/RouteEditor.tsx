"use client";

import { useState } from "react";
import { Trash2, RefreshCw, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { PlannedLocation } from "../stores/placesStore";

interface RouteEditorProps {
  locations: PlannedLocation[];
  onLocationsChange: (locations: PlannedLocation[]) => void;
  onRegeneratePoint?: (index: number) => void;
  onAddPoint?: () => void;
  compact?: boolean;
}

export default function RouteEditor({
  locations,
  onLocationsChange,
  onRegeneratePoint,
  onAddPoint,
  compact = false,
}: RouteEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDelete = (index: number) => {
    const newLocations = locations.filter((_, i) => i !== index);
    onLocationsChange(newLocations);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newLocations = [...locations];
    const [movedItem] = newLocations.splice(fromIndex, 1);
    newLocations.splice(toIndex, 0, movedItem);
    onLocationsChange(newLocations);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      handleReorder(dragIndex, index);
      setDragIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  if (locations.length === 0) {
    return (
      <div
        className={`bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-lg p-3 mx-auto w-full max-w-6xl ${
          compact ? "mb-1" : "mb-2"
        }`}
      >
        <div className="text-center text-gray-500 text-xs">
          <p>No route points yet. Generate a route to see the editor.</p>
        </div>
      </div>
    );
  }

  // Show minimal collapsed view
  if (isCollapsed) {
    return (
      <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-lg p-3 mx-auto w-fit transition-all duration-300 ease-in-out">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all duration-200 hover:shadow-md"
          title="Expand Route Editor"
        >
          <span className="font-medium text-indigo-700">Route Editor</span>
          <ChevronDown className="w-3 h-3 text-indigo-600" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-lg ${
        compact ? "p-2" : "p-4"
      } mx-auto ${
        compact ? "mb-1" : "mb-2"
      } transition-all duration-300 ease-in-out ${
        locations.length <= 3
          ? "w-fit max-w-md min-w-[400px]" // Very small width for 3 or fewer locations
          : locations.length <= 5
            ? "w-fit min-w-[500px]" // Small width for 4-5 locations
            : "w-full max-w-6xl" // Full width for 6+ locations with proper scrolling
      }`}
    >
      <div
        className={`flex items-center justify-between ${
          compact ? "mb-2" : "mb-3"
        }`}
      >
        <h3
          className={`${
            compact ? "text-sm" : "text-lg"
          } font-semibold text-gray-800`}
        >
          Route Editor
        </h3>
        <div className="flex items-center gap-1">
          {onAddPoint && (
            <button
              onClick={onAddPoint}
              className={`flex items-center gap-1 ${
                compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
              } bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors`}
            >
              <Plus className={compact ? "w-3 h-3" : "w-4 h-4"} />
              {compact ? "Add" : "Add Point"}
            </button>
          )}
        </div>
      </div>

      <div
        className={`flex items-center gap-4 pb-1 ${
          locations.length <= 3 ? "justify-center" : ""
        } ${
          locations.length > 5 
            ? "overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
            : "overflow-visible"
        }`}
      >
        {locations.map((location, index) => (
          <div
            key={`${location.id}-${index}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex-shrink-0 relative group ${
              dragIndex === index ? "opacity-100" : ""
            }`}
          >
            {/* Connection line */}
            {index > 0 && (
              <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-gray-300 transform -translate-y-1/2" />
            )}

            {/* Route point card */}
            <div
              className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all ${
                compact ? "p-1 w-32 h-24" : "p-3 w-40 h-32"
              }`}
            >
              <div className="h-full flex flex-col justify-between">
                {/* Order badge */}
                <div className="flex items-center justify-between">
                  <div
                    className={`${
                      compact ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs"
                    } bg-blue-600 text-white rounded-full flex items-center justify-center font-bold`}
                  >
                    {index + 1}
                  </div>
                  <div className={`flex items-center gap-0.5`}>
                    {onRegeneratePoint && (
                      <button
                        onClick={() => onRegeneratePoint(index)}
                        className="p-0.5 text-gray-500 hover:text-green-600"
                        title="Regenerate"
                      >
                        <RefreshCw
                          className={compact ? "w-3 h-3" : "w-3.5 h-3.5"}
                        />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(index)}
                      className="p-0.5 text-gray-500 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
                    </button>
                  </div>
                </div>

                {/* Location info */}
                <div className="flex-1">
                  <h4
                    className={`font-medium text-gray-900 truncate ${
                      compact ? "text-xs" : "text-sm"
                    }`}
                  >
                    {location.name}
                  </h4>
                  <p
                    className={`text-gray-500 truncate ${
                      compact ? "text-[10px]" : "text-xs"
                    }`}
                  >
                    {location.formatted_address || location.type}
                  </p>

                  {/* Rating section - fixed height */}
                  <div
                    className={`flex items-center gap-0.5 mt-0.5 ${
                      compact ? "h-3" : "h-4"
                    }`}
                  >
                    {location.rating ? (
                      <>
                        <span
                          className={`${
                            compact ? "text-[10px]" : "text-xs"
                          } text-yellow-600`}
                        >
                          ⭐
                        </span>
                        <span
                          className={`${
                            compact ? "text-[10px]" : "text-xs"
                          } text-gray-600`}
                        >
                          {location.rating}
                          {location.user_rating_total &&
                            ` (${location.user_rating_total})`}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`${
                          compact ? "text-[10px]" : "text-xs"
                        } text-gray-400`}
                      >
                        No rating
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags - fixed height container */}
                <div className={`${compact ? "h-4" : "h-5"} overflow-hidden`}>
                  {location.tags && location.tags.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {location.tags.slice(0, 1).map((tag, tagIndex) => {
                        const displayTag =
                          tag.length > 8 ? tag.substring(0, 8) + "..." : tag;
                        return (
                          <span
                            key={tagIndex}
                            className={`px-0.5 ${
                              compact ? "py-0 text-[9px]" : "py-0.5 text-[10px]"
                            } bg-gray-100 text-gray-600 rounded truncate`}
                            title={tag}
                          >
                            {displayTag}
                          </span>
                        );
                      })}
                      {location.tags.length > 1 && (
                        <span
                          className={`${
                            compact ? "text-[9px]" : "text-[10px]"
                          } text-gray-500 flex-shrink-0`}
                        >
                          +{location.tags.length - 1}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 mt-2 overflow-x-auto text-center">
        <p>
          Drag cards to reorder • Click delete to remove • Use regenerate to get
          alternatives
        </p>
      </div>

      {/* Minimize button positioned at bottom edge */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-7 h-5 bg-white border border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm z-10"
        title="Minimize Route Editor"
      >
        <ChevronUp className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
}
