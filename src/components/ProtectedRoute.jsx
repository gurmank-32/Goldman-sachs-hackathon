import { Navigate } from "react-router-dom";
import { useAuth } from "../store/AppContext.jsx";

/**
 * Wraps routes that require authentication.
 * Loading → full-screen spinner; unauthenticated → /signin; else children.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0A1628]">
        <div
          className="auth-route-spinner auth-route-spinner--marcus"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}
