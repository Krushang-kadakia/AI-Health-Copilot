import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import ChatCopilot from "./pages/ChatCopilot";
import RiskAnalysis from "./pages/RiskAnalysis";
import NearbyHelp from "./pages/NearbyHelp";
import Login from "./pages/Login";
import { AuthProvider } from "./lib/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<ChatCopilot />} />
            <Route path="/risk" element={<RiskAnalysis />} />
            <Route path="/nearby" element={<NearbyHelp />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;