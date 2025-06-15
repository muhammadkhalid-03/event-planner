export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Customize your location finder experience
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Display Preferences
              </h2>
              <p className="text-gray-600">Coming soon...</p>
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Location Settings
              </h2>
              <p className="text-gray-600">Coming soon...</p>
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Notifications
              </h2>
              <p className="text-gray-600">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
