import { Navigate } from "react-router-dom";
import { getDashboardBlockRedirect } from "../utils/authRouting.js";

export default function DashboardGate({ children }) {
  const block =
    typeof localStorage !== "undefined" ? getDashboardBlockRedirect() : "/";
  if (block) return <Navigate to={block} replace />;
  return children;
}
