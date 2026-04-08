import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Loader2, Mail, Lock, User, ArrowRight, HeartPulse } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? 'http://127.0.0.1:8000/api/login' : 'http://127.0.0.1:8000/api/register';
    
    // Using FormData for compatibility with the backend's oauth2-like Form parameters
    const body = new FormData();
    body.append('username', formData.username);
    body.append('password', formData.password);
    if (!isLogin) body.append('email', formData.email);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: body
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');

      login(data.access_token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-200 mb-4 transform transition-transform hover:scale-105">
            <HeartPulse size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Health Copilot</h1>
          <p className="text-slate-500 mt-2 font-medium">Your personalized medical journey starts here</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8">
            <div className="flex bg-slate-50 p-1 rounded-xl mb-8">
              <button 
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Login
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input 
                    type="text" 
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl outline-none focus:border-blue-600 focus:bg-white transition-all text-slate-900 font-medium"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-left-2 transition-all">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl outline-none focus:border-blue-600 focus:bg-white transition-all text-slate-900 font-medium"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl outline-none focus:border-blue-600 focus:bg-white transition-all text-slate-900 font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-70 mt-8"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
             <p className="text-sm text-slate-500 font-medium">
               {isLogin ? "Don't have an account?" : "Already have an account?"} 
               <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 font-bold ml-1.5 hover:underline"
               >
                 {isLogin ? 'Join now' : 'Log in'}
               </button>
             </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8 font-medium">
          Secure healthcare collaboration protected by industry-standard encryption.
        </p>
      </div>
    </div>
  );
}
