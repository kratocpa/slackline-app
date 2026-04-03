import { Routes, Route } from 'react-router-dom';
import { useEffect, Component, ReactNode } from 'react';
import HomePage from './pages/HomePage';
import SlacklineDetailPage from './pages/SlacklineDetailPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { useAuthStore } from './store/authStore';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 text-center">
          <div className="text-red-600 font-semibold mb-2">Something went wrong</div>
          <div className="text-sm text-gray-500 mb-4">{this.state.error.message}</div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            onClick={() => this.setState({ error: null })}
          >Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/slacklines/:id" element={<SlacklineDetailPage />} />
        <Route path="/auth/callback/:provider" element={<AuthCallbackPage />} />
      </Routes>
    </ErrorBoundary>
  );
}


