export default function FavoritesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Favorite Locations
          </h1>
          <p className="text-gray-600">Quick access to your favorite places</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-center">
            No favorite locations yet.
          </p>
        </div>
      </div>
    </main>
  );
}
