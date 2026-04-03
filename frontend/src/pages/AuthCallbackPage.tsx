import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    hydrate().then(() => navigate('/'));
  }, [hydrate, navigate]);
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-700">Logging in...</div>
        <p className="text-sm text-gray-500 mt-2">Please wait while we verify your account.</p>
      </div>
    </div>
  );
}
