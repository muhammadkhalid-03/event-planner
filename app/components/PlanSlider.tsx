// components/EventSlider.tsx
"use client";

import { ChevronLeft, ChevronRight, RefreshCw, Trash } from "lucide-react";

export interface PlannedLocation {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    type: string;
    address?: string;
    rating?: number;
    order?: number;
    tags?: string[];           // Added this to match EventPlanData
    user_rating_total?: number; // Added for full compatibility
    price_level?: number;       // Added for full compatibility
}

interface EventSliderProps {
    locations: PlannedLocation[];
    currentIndex: number;
    onSelect: (index: number) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string) => void; // Used for regeneration or editing details
}

export default function PlanSlider({
                                       locations,
                                       currentIndex,
                                       onSelect,
                                       onDelete,
                                       onEdit,
                                   }: EventSliderProps) {
    if (!locations || locations.length === 0) return null;

    const currentLocation = locations[currentIndex];

    return (
        <div className="bg-white rounded-xl shadow-lg p-4 max-w-2xl mx-auto relative">
            {/* Navigation */}
            <div className="flex justify-between items-center mb-3">
                <button
                    onClick={() =>
                        onSelect((currentIndex - 1 + locations.length) % locations.length)
                    }
                    className="p-2 rounded-full hover:bg-gray-100"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-center">
                    {currentLocation.name || "Unnamed Location"}
                </h2>
                <button
                    onClick={() => onSelect((currentIndex + 1) % locations.length)}
                    className="p-2 rounded-full hover:bg-gray-100"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Location Details */}
            <div className="text-center">
                {currentLocation.address && (
                    <p className="text-sm text-gray-600">{currentLocation.address}</p>
                )}
                {currentLocation.rating !== undefined && (
                    <p className="text-xs text-yellow-600">
                        ⭐ {currentLocation.rating.toFixed(1)}
                    </p>
                )}
                {currentLocation.tags && currentLocation.tags.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                        {currentLocation.tags.join(", ")}
                    </p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-4">
                <button
                    onClick={() => onEdit(currentLocation.id)}
                    className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                    <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
                <button
                    onClick={() => onDelete(currentLocation.id)}
                    className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                    <Trash className="w-4 h-4" /> Delete
                </button>
            </div>
        </div>
    );
}
