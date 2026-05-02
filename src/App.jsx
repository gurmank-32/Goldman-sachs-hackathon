import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DemoModePill from "./components/DemoModePill.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DecisionLog from "./pages/DecisionLog.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import GoalSetter from "./pages/GoalSetter.jsx";
import ImpactPreview from "./pages/ImpactPreview.jsx";
import RebalanceWizard from "./pages/RebalanceWizard.jsx";
import RiskProfiler from "./pages/RiskProfiler.jsx";
import Settings from "./pages/Settings.jsx";
import Scenarios from "./pages/Scenarios.jsx";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";
import { AppProvider, useAuth } from "./store/AppContext.jsx";
import FinPilot from "./uploaded/finpilot.jsx";

/**
 * Router + demo pill live under AppProvider so useAuth() matches session state
 * app-wide (ProtectedRoute gate, SignIn redirect targets, Demo Mode shortcuts).
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
                <FinPilot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goal"
            element={
              <ProtectedRoute>
                <GoalSetter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scenarios"
            element={
              <ProtectedRoute>
                <Scenarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/impact"
            element={
              <ProtectedRoute>
                <ImpactPreview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rebalance"
            element={
              <ProtectedRoute>
                <RebalanceWizard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/decisions"
            element={
              <ProtectedRoute>
                <DecisionLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finpilot"
            element={
              <ProtectedRoute>
                <FinPilot />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
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
