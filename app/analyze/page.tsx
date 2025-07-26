import EventPlanner from '../components/RestaurantAnalyzer';

export default function AnalyzePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="ml-16"> {/* Account for the fixed sidebar */}
        <EventPlanner />
      </div>
    </div>
  );
} 