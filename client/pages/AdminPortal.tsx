import { useAuth } from '@/context/AuthProvider';

export default function AdminPortal() {
  const { user, isAdmin } = useAuth();
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Admin Portal</h1>
      <p className="text-gray-600 mb-6">Signed in as {user?.email}</p>
      {!isAdmin && (
        <div className="p-4 border rounded text-sm text-amber-700 bg-amber-50">
          You are signed in, but your role is not "admin". Limited access.
        </div>
      )}
      {isAdmin && (
        <div className="p-4 border rounded text-sm text-emerald-700 bg-emerald-50">
          Admin tools will appear here.
        </div>
      )}
    </div>
  );
}
