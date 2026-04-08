import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageSquareHeart, FileText, Activity, MapPin, Image as ImageIcon, Loader2, Clock } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function Dashboard() {
  const { token } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      <section className="space-y-2 mt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Welcome to your Health Copilot
        </h1>
        <p className="text-lg text-slate-500">
          Choose a specialized module or start chatting directly with the AI assistant.
        </p>
      </section>

      {/* Modules Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <Link to="/chat" className="p-6 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group hover:border-blue-200">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
            <MessageSquareHeart className="h-6 w-6 text-blue-600"/>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Check Symptoms</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">Chat with the AI to understand your symptoms and receive personalized Ayurvedic remedies.</p>
        </Link>
        <Link to="/chat" className="p-6 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group hover:border-emerald-200">
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
            <FileText className="h-6 w-6 text-emerald-600"/>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Analyze Report</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">Upload medical PDF reports direct to chat for precise medical extraction & clear summaries.</p>
        </Link>
        <Link to="/risk" className="p-6 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group hover:border-rose-200">
          <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center mb-4 group-hover:bg-rose-100 transition-colors">
            <Activity className="h-6 w-6 text-rose-600"/>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Risk Assessment</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">Structurally input your demographics to predict long-term lifestyle disease risks.</p>
        </Link>
        <Link to="/nearby" className="p-6 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group hover:border-amber-200">
          <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
            <MapPin className="h-6 w-6 text-amber-600"/>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Nearby Facilities</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">Instantly locate verified Google Maps hospitals and clinics near your IP location.</p>
        </Link>
      </section>

      {/* Recent Activity Section */}
      <section className="p-6 border rounded-2xl bg-white shadow-sm mt-8 border-slate-100 min-h-[200px]">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Recent Activity</h2>
            {token && <Link to="/chat" className="text-xs font-bold text-blue-600 hover:underline">New Chat +</Link>}
         </div>
         
         {!token ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
               <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-blue-500">
                  <Clock size={32} />
               </div>
               <h3 className="text-slate-800 font-bold">Login to see history</h3>
               <p className="text-slate-500 text-sm mt-1 px-6">Your consultations and medical reports are saved securely to your account for future reference.</p>
               <Link to="/login" className="mt-6 px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95">
                  Sign In Now
               </Link>
            </div>
         ) : loading ? (
            <div className="flex items-center justify-center py-10">
               <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
         ) : history.length > 0 ? (
            <div className="flex flex-col gap-3">
               {history.map((item) => (
                  <Link 
                    key={item.id} 
                    to={`/chat?id=${item.id}`}
                    className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors p-4 rounded-xl border border-transparent hover:border-slate-200 cursor-pointer group"
                  >
                      <div className="h-10 w-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                        {item.title.toLowerCase().includes('image') ? <ImageIcon size={18}/> : <MessageSquareHeart size={18}/>}
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{item.title}</p>
                         <div className="flex items-center gap-2 mt-1">
                            <Clock size={12} className="text-slate-400"/>
                            <span className="text-xs text-slate-400 font-medium">{formatDate(item.updated_at)}</span>
                         </div>
                      </div>
                      <div className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 group-hover:border-blue-200 group-hover:text-blue-400 transition-all">
                         <Activity size={14}/>
                      </div>
                  </Link>
               ))}
            </div>
         ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
               <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
                  <MessageSquareHeart size={32} />
               </div>
               <p className="text-slate-400 font-medium text-sm">No recent activity yet. Start your first health consultation!</p>
               <Link to="/chat" className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-100 hover:bg-blue-700 transition-all">
                  Get Started
               </Link>
            </div>
         )}
      </section>
    </div>
  );
}
