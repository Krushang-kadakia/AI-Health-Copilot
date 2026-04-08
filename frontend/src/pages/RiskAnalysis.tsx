import { useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function RiskAnalysis() {
  const [formData, setFormData] = useState({ age: 30, weight: 70, height: 170, exercise: "Sometimes", diet: "Average" });
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculateRisk = async () => {
    setIsLoading(true);
    setResult("");
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/predict-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error("Server error");
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setResult((prev) => (prev || "") + chunk);
        }
      }
    } catch (e: any) {
      setResult("Error calculating risk: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-8 animate-in fade-in duration-500 py-12">
       <div className="text-center space-y-3">
         <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6 border border-rose-100">
           <Activity size={28}/>
         </div>
         <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Predict Health Risks</h1>
         <p className="text-slate-500 text-lg">Input your demographics to logically predict potential lifestyle condition risks (Diabetes, Heart Disease, Obesity) powered by AI.</p>
       </div>
       
       <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-100 space-y-8 mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
             <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-700">Age <span className="text-slate-400 font-normal">(Years)</span></label>
               <input type="number" min={1} max={120} value={formData.age} onChange={e => setFormData({...formData, age: Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none transition-all" />
             </div>
             
             <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-700">Weight <span className="text-slate-400 font-normal">(kg)</span></label>
               <input type="number" min={1} max={300} value={formData.weight} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none transition-all" />
             </div>

             <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-700">Height <span className="text-slate-400 font-normal">(cm)</span></label>
               <input type="number" min={50} max={250} value={formData.height} onChange={e => setFormData({...formData, height: Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none transition-all" />
             </div>

             <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-700">Exercise Frequency</label>
               <select value={formData.exercise} onChange={e => setFormData({...formData, exercise: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none transition-all appearance-none">
                 <option>Never</option>
                 <option>Rarely</option>
                 <option>Sometimes</option>
                 <option>Often</option>
                 <option>Daily</option>
               </select>
             </div>

             <div className="space-y-2 sm:col-span-2">
               <label className="text-sm font-semibold text-slate-700">Diet Setup</label>
               <select value={formData.diet} onChange={e => setFormData({...formData, diet: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none transition-all appearance-none">
                 <option>Poor (Junk Food heavily)</option>
                 <option>Average (Balanced but occasional junk)</option>
                 <option>Good (Healthy eating primarily)</option>
                 <option>Excellent (Strict balanced macros)</option>
               </select>
             </div>
          </div>
          
          <button onClick={calculateRisk} disabled={isLoading} className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium p-4 rounded-xl transition-colors shadow-sm mt-4 flex justify-center items-center gap-2">
            {isLoading && <Loader2 className="animate-spin w-5 h-5"/>}
            {isLoading ? "Analyzing Data..." : "Generate Risk Profile"}
          </button>
       </div>

       {result && (
         <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200 animate-in slide-in-from-bottom-4 duration-500 fade-in shadow-inner">
           <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
             <Activity className="h-5 w-5 text-rose-500"/> Copilot Assessment
           </h2>
           <div className="prose prose-sm sm:prose-base max-w-none prose-slate prose-rose prose-p:leading-relaxed prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-li:my-0 break-words relative z-0">
             <ReactMarkdown remarkPlugins={[remarkGfm]}>
               {result}
             </ReactMarkdown>
           </div>
         </div>
       )}
    </div>
  );
}
