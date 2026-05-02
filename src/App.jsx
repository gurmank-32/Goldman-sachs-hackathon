import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardGate from "./components/DashboardGate.jsx";
import DemoModePill from "./components/DemoModePill.jsx";
import LinkAccountsGate from "./components/LinkAccountsGate.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LinkAccounts from "./pages/LinkAccounts.jsx";
import OnboardingGoalPage from "./pages/OnboardingGoalPage.jsx";
import OnboardingQuizPage from "./pages/OnboardingQuizPage.jsx";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";
import { AppProvider, useAuth } from "./store/AppContext.jsx";
import FinPilot from "./uploaded/finpilot.jsx";

/**
 * In-app onboarding order (protected):
 *   `/` (risk profiler quiz) → `/goal` (targets) → `/link-accounts` (optional linking) → `/dashboard`.
 * Sign-up may go straight to `/link-accounts` after account creation when the quiz is completed there.
 */
function AppRoutes() {
  const { currentUser } = useAuth();
  const sessionKey = currentUser?.email ?? "guest";

  return (
    <>
      <Routes key={sessionKey}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <OnboardingQuizPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/goal"
          element={
            <ProtectedRoute>
              <OnboardingGoalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/link-accounts"
          element={
            <ProtectedRoute>
              <LinkAccountsGate>
                <LinkAccounts />
              </LinkAccountsGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardGate>
                <FinPilot />
              </DashboardGate>
            </ProtectedRoute>
          }
        />

        <Route path="/finpilot" element={<Navigate to="/dashboard" replace />} />
        <Route path="/scenarios" element={<Navigate to="/dashboard" replace />} />
        <Route path="/impact" element={<Navigate to="/dashboard" replace />} />
        <Route path="/rebalance" element={<Navigate to="/dashboard" replace />} />
        <Route path="/decisions" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardGate>
                <FinPilot />
              </DashboardGate>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
