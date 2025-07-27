"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Edit, Trash2, RefreshCw, Plus } from "lucide-react";
import { PlannedLocation } from "../stores/placesStore";

interface RouteEditorProps {
  locations: PlannedLocation[];
  onLocationsChange: (locations: PlannedLocation[]) => void;
  onRegeneratePoint?: (index: number) => void;
  onAddPoint?: () => void;
}

export default function RouteEditor({
  locations,
  onLocationsChange,
  onRegeneratePoint,
  onAddPoint,
}: RouteEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleEditSave = (index: number, updatedLocation: Partial<PlannedLocation>) => {
    const newLocations = [...locations];
    newLocations[index] = { ...newLocations[index], ...updatedLocation };
    onLocationsChange(newLocations);
    setEditingIndex(null);
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
  };

  if (locations.length === 0) {
    return (
      <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-lg p-4 mx-auto w-full max-w-6xl mb-4">
        <div className="text-center text-gray-500">
          <p>No route points yet. Generate a route to see the editor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-lg p-4 mx-auto w-full max-w-6xl mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Route Editor</h3>
        <div className="flex items-center gap-2">
          {onAddPoint && (
            <button
              onClick={onAddPoint}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Point
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {locations.map((location, index) => (
          <div
            key={`${location.id}-${index}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex-shrink-0 relative group ${
              dragIndex === index ? "opacity-50" : ""
            }`}
          >
            {/* Connection line */}
            {index > 0 && (
              <div className="absolute -left-2 top-1/2 w-4 h-0.5 bg-gray-300 transform -translate-y-1/2" />
            )}

            {/* Route point card */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-3 min-w-[200px] shadow-md hover:shadow-lg transition-all">
              {editingIndex === index ? (
                <LocationEditForm
                  location={location}
                  onSave={(updatedLocation) => handleEditSave(index, updatedLocation)}
                  onCancel={handleEditCancel}
                />
              ) : (
                <div className="space-y-2">
                  {/* Order badge */}
                  <div className="flex items-center justify-between">
                    <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(index)}
                        className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      {onRegeneratePoint && (
                        <button
                          onClick={() => onRegeneratePoint(index)}
                          className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                          title="Regenerate"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(index)}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Location info */}
                  <div>
                    <h4 className="font-medium text-gray-900 truncate">
                      {location.name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {location.formatted_address || location.type}
                    </p>
                    {location.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-yellow-600">⭐</span>
                        <span className="text-xs text-gray-600">
                          {location.rating}
                          {location.user_rating_total && ` (${location.user_rating_total})`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {location.tags && location.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {location.tags.slice(0, 2).map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {location.tags.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{location.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 mt-3">
        <p>💡 Drag cards to reorder • Click edit to modify • Use regenerate to get alternatives</p>
      </div>
    </div>
  );
}

interface LocationEditFormProps {
  location: PlannedLocation;
  onSave: (updatedLocation: Partial<PlannedLocation>) => void;
  onCancel: () => void;
}

function LocationEditForm({ location, onSave, onCancel }: LocationEditFormProps) {
  const [name, setName] = useState(location.name);
  const [address, setAddress] = useState(location.formatted_address || "");

  const handleSave = () => {
    onSave({
      name,
      formatted_address: address,
    });
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
} 