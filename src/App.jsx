import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DemoModePill from "./components/DemoModePill.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";
import { AppProvider, useAuth } from "./store/AppContext.jsx";
import FinPilot from "./uploaded/finpilot.jsx";

/**
 * Single authenticated surface: FinPilot at `/`.
 * Legacy paths redirect here so bookmarks still work.
 */
function AppRoutes() {
  const { currentUser } = useAuth();
  const sessionKey = currentUser?.email ?? "guest";

  const redirectHome = <Navigate to="/" replace />;

  return (
    <>
      <Routes key={sessionKey}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <FinPilot />
            </ProtectedRoute>
          }
        />

        <Route path="/dashboard" element={redirectHome} />
        <Route path="/finpilot" element={redirectHome} />
        <Route path="/goal" element={redirectHome} />
        <Route path="/scenarios" element={redirectHome} />
        <Route path="/impact" element={redirectHome} />
        <Route path="/rebalance" element={redirectHome} />
        <Route path="/decisions" element={redirectHome} />
        <Route path="/settings" element={redirectHome} />

        <Route path="*" element={redirectHome} />
      </Routes>
      <DemoModePill />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
