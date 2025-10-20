import { AuthProvider, useAuth } from './auth/AuthContext';
import SleeperFFHelper from './components/SleeperFFHelper';
import LoginScreen from './components/LoginScreen';

function AppContent() {
  const { isAuthenticated, loading, user, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="relative">
      {/* User header with logout */}
      <div className="fixed top-0 right-0 z-50 p-4">
        <div className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-lg rounded-lg px-4 py-2 border border-purple-500/30">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{user?.display_name}</p>
            <p className="text-xs text-gray-400">@{user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <SleeperFFHelper />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
