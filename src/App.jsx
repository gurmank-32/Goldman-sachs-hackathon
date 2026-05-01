import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import GoalSetter from "./pages/GoalSetter.jsx";
import RiskProfiler from "./pages/RiskProfiler.jsx";
import DecisionLog from "./pages/DecisionLog.jsx";
import ImpactPreview from "./pages/ImpactPreview.jsx";
import RebalanceWizard from "./pages/RebalanceWizard.jsx";
import Scenarios from "./pages/Scenarios.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen min-h-dvh overflow-x-hidden bg-neutral-50 text-neutral-900 antialiased">
        <Routes>
          <Route path="/" element={<RiskProfiler />} />
          <Route path="/goal" element={<GoalSetter />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Scenario planning */}
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/impact" element={<ImpactPreview />} />
          <Route path="/rebalance" element={<RebalanceWizard />} />
          <Route path="/decisions" element={<DecisionLog />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
