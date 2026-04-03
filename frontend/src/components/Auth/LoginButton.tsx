import { useAuthStore } from '../../store/authStore';
export default function LoginButton() {
  const { user, logout } = useAuthStore();
  if (user) {
    return (
      <div className="flex items-center gap-3">
        {user.avatar_url && (
          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
        )}
        <span className="text-sm text-gray-700">{user.display_name || user.username}</span>
        <button onClick={logout} className="text-sm text-red-600 hover:underline">
          Logout
        </button>
      </div>
    );
  }
  return (
    <a
      href="/api/v1/auth/login/google"
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
    >
      Login with Google
    </a>
  );
}
