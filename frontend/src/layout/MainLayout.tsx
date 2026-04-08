import { Outlet, Link, useLocation } from "react-router-dom";
import { Activity, Stethoscope, MessageSquareHeart, MapPin, LogOut } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

export default function MainLayout() {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Activity },
    { path: "/chat", label: "AI Copilot", icon: MessageSquareHeart },
    { path: "/risk", label: "Risk Analysis", icon: Stethoscope },
    { path: "/nearby", label: "Nearby Help", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur shadow-sm">
        <div className="container mx-auto flex h-16 items-center px-4 sm:px-8">
          <div className="flex items-center gap-2 mr-8">
            <span className="text-xl font-bold text-blue-600 flex items-center gap-2">
              <Stethoscope className="h-6 w-6" /> AI Copilot
            </span>
          </div>
          <nav className="flex items-center space-x-6 overflow-x-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-600 ${
                    isActive ? "text-blue-600" : "text-slate-500"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          {useAuth().isAuthenticated ? (
            <button 
              onClick={logout}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors ml-4"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline-block">Logout</span>
            </button>
          ) : (
            <Link 
              to="/login"
              className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 px-4 py-2 rounded-xl hover:bg-blue-700 transition-all ml-4 shadow-lg shadow-blue-100"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {!useAuth().isAuthenticated && (
        <div className="bg-blue-600 text-white py-2 px-4 text-center text-xs font-bold uppercase tracking-widest animate-in slide-in-from-top duration-500">
          You are using AI Health Copilot as a guest. 
          <Link to="/login" className="underline ml-2 hover:text-blue-100">Login to save your chat history and medical reports.</Link>
        </div>
      )}

      <main className={`flex-1 w-full ${location.pathname === "/chat" ? "" : "mx-auto max-w-7xl"}`}>
        <Outlet />
      </main>
    </div>
  );
}
