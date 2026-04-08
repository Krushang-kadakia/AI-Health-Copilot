import { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Send, ImageIcon, FileText, Mic, Bot, User, X, Loader2, Volume2, StopCircle, PanelLeftClose, PanelLeft, Plus, MessageSquare, Trash2, ChevronRight, Activity, Clock } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from "../lib/AuthContext";

const API_BASE_URL = "http://127.0.0.1:8000";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachment?: { type: "image" | "pdf"; name: string; file?: File; previewUrl?: string };
};

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function ChatCopilot() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = searchParams.get("id");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I am your AI Health Copilot. How can I assist you with your health today? You can describe symptoms, ask for Ayurvedic remedies, or upload a medical report or image."
    }
  ]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(activeConversationId);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<{ type: "image" | "pdf"; name: string; file?: File; previewUrl?: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<"en-US" | "hi-IN">("en-US");
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const blobUrlsRef = useRef<string[]>([]);

  // Fetch Conversation List
  const fetchConversations = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchConversations();
  }, [currentConversationId, token]);

  // Fetch history if activeConversationId changes
  useEffect(() => {
    if (activeConversationId && token) {
      fetchHistory(activeConversationId);
      setCurrentConversationId(activeConversationId);
    } else {
      setCurrentConversationId(null);
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: "Hello! I am your AI Health Copilot. How can I assist you with your health today? You can describe symptoms, ask for Ayurvedic remedies, or upload a medical report or image."
        }
      ]);
    }
  }, [activeConversationId]);

  const fetchHistory = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      
      const historicalMessages: Message[] = data.messages.map((m: any, index: number) => ({
        id: `hist-${index}`,
        role: m.role,
        content: m.content,
        attachment: m.file_path ? {
          type: m.file_type,
          name: m.file_path.split('/').pop(),
          previewUrl: `${API_BASE_URL}${m.file_path}`
        } : undefined
      }));
      setMessages(historicalMessages);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const startNewChat = () => {
    setSearchParams({});
    setCurrentConversationId(null);
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
          setHistoryList(prev => prev.filter(c => c.id.toString() !== id.toString()));
          if (activeConversationId === id.toString()) {
              startNewChat();
          }
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);
  
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) {}
      });
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (recognitionRef.current) recognitionRef.current.lang = language;
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInput("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.onstart = () => {};
    utterance.onend = () => {};
    window.speechSynthesis.speak(utterance);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "pdf") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      blobUrlsRef.current.push(previewUrl);
      setAttachment({ type, name: file.name, file, previewUrl });
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;
    if (isListening) recognitionRef.current?.stop();

    const currentInput = input;
    const currentAttachment = attachment;
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      attachment: currentAttachment ? { ...currentAttachment } : undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setAttachment(null);
    setIsTyping(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const formData = new FormData();
      if (currentInput) formData.append("message", currentInput);
      if (currentAttachment?.file) formData.append("file", currentAttachment.file);
      if (currentConversationId) formData.append("conversation_id", currentConversationId);

      let endpoint = `${API_BASE_URL}/api/chat`;
      if (currentAttachment) {
        endpoint = currentAttachment.type === "image" 
          ? `${API_BASE_URL}/api/analyze-image` 
          : `${API_BASE_URL}/api/analyze-report`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setMessages((prev) => 
            prev.map((msg) => msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg)
          );
        }
        if (!currentConversationId) fetchConversations();
      }
    } catch (error: any) {
      setMessages((prev) => 
        prev.map((msg) => msg.id === assistantId ? { ...msg, content: `Error: ${error.message}` } : msg)
      );
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4.1rem)] w-full overflow-hidden bg-[#f8fafc]">
      {/* Sidebar - Extreme Left */}
      <aside 
        className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out relative z-30 shadow-2xl h-full overflow-hidden`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 overflow-hidden whitespace-nowrap">
           <div className="flex items-center gap-2 min-w-0">
              <div className="flex-shrink-0 h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
              <h2 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] truncate">Consultations</h2>
           </div>
           <button 
            onClick={startNewChat}
            className="group p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            title="Start New Chat"
           >
             <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar h-full">
           {!token ? (
             <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6">
                <div className="h-20 w-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-300 shadow-inner">
                  <Clock size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-slate-800 font-black text-sm uppercase tracking-tighter">History Disabled</h3>
                  <p className="text-[11px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">Login to save your medical consultations and sync across devices.</p>
                </div>
                <Link to="/login" className="w-full py-3 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                  Sign In
                </Link>
             </div>
           ) : isHistoryLoading && historyList.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-20">
               <Loader2 className="animate-spin" size={32} />
               <span className="text-xs font-bold uppercase tracking-widest">Loading...</span>
             </div>
           ) : historyList.map((item) => (
             <div
              key={item.id}
              onClick={() => setSearchParams({ id: item.id })}
              className={`group relative w-full p-4 rounded-2xl transition-all cursor-pointer border flex flex-col gap-1 overflow-hidden ${
                item.id.toString() === activeConversationId 
                  ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-100' 
                  : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-100'
              }`}
             >
               <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare size={16} className={item.id.toString() === activeConversationId ? 'text-white' : 'text-blue-500'} />
                    <span className={`text-sm font-bold truncate tracking-tight ${item.id.toString() === activeConversationId ? 'text-white' : 'text-slate-700'}`}>
                      {item.title}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => deleteConversation(e, item.id)}
                    className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                      item.id.toString() === activeConversationId ? 'hover:bg-white/20 text-white' : 'hover:bg-rose-50 text-slate-300 hover:text-rose-600'
                    }`}
                  >
                    <Trash2 size={14} />
                  </button>
               </div>
               <div className={`text-[10px] uppercase tracking-wider font-semibold opacity-60 ml-7 flex items-center gap-1 ${item.id.toString() === activeConversationId ? 'text-blue-100' : 'text-slate-400'}`}>
                  <Activity size={10} /> session active
               </div>

               {/* Background Decorative Element */}
               {item.id.toString() === activeConversationId && (
                 <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white/10 to-transparent pointer-none" />
               )}
             </div>
           ))}
           {token && !isHistoryLoading && historyList.length === 0 && (
             <div className="text-center py-20 px-6 space-y-4">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                  <Bot size={32} />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">No previous activity detected</p>
             </div>
           )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative w-full h-full bg-white">
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute top-6 left-6 z-40 p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-95 ${sidebarOpen ? 'opacity-100' : 'hover:bg-blue-600 hover:text-white'}`}
        >
          {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
        </button>

        {/* Hidden File Inputs */}
        <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={(e) => handleFileChange(e, "image")} />
        <input type="file" accept="application/pdf" className="hidden" ref={pdfInputRef} onChange={(e) => handleFileChange(e, "pdf")} />

        {/* Messages Container - Extreme Right Scrollbar */}
        <div className="flex-1 overflow-y-auto w-full pt-20 pb-8 relative custom-scrollbar flex flex-col items-center">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
            <div className={`px-5 py-2 rounded-full text-[11px] font-black tracking-[0.15em] uppercase shadow-2xl border backdrop-blur-md transition-all flex items-center gap-3 ${
              language === "hi-IN" ? "bg-orange-50/80 text-orange-600 border-orange-100" : "bg-blue-50/80 text-blue-600 border-blue-100"
            }`}>
               <div className={`w-2 h-2 rounded-full animate-pulse ${language === "hi-IN" ? "bg-orange-600" : "bg-blue-600"}`} />
               {language === "en-US" ? "AI COPILOT PRO: ENGLISH" : "एआई कोपायलट प्रो: हिंदी"}
            </div>
          </div>

          <div className="w-full max-w-5xl px-6 sm:px-10 space-y-10 mt-8">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex w-full animate-in fade-in slide-in-from-bottom-4 duration-500 gap-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg transform -translate-y-2">
                    <Bot size={22} />
                  </div>
                )}
                
                <div className={`relative max-w-[85%] sm:max-w-[80%] rounded-[2rem] p-6 shadow-2xl transition-all ${
                  msg.role === "user" 
                    ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none" 
                    : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                }`}>
                  {msg.attachment && (
                    <div className="mb-4">
                      {msg.attachment.type === "image" ? (
                        <div className="relative group rounded-3xl overflow-hidden border-4 border-white shadow-2xl max-w-md transition-transform hover:scale-[1.02]">
                          <img src={msg.attachment.previewUrl} alt={msg.attachment.name} className="max-h-96 w-full object-cover bg-slate-50" />
                        </div>
                      ) : (
                        <div className={`group flex items-center gap-4 p-5 rounded-3xl border-2 backdrop-blur-sm ${
                          msg.role === "user" ? "bg-white/10 border-white/20 text-white shadow-inner" : "bg-slate-50 border-slate-100 text-slate-800 shadow-sm"
                        }`}>
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${msg.role === "user" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-600"}`}>
                             <FileText size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate uppercase tracking-tighter">{msg.attachment.name}</p>
                            <p className="text-[10px] opacity-60 font-bold">Medical Document Analysis</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="leading-relaxed text-[15px] sm:text-[16px] font-medium">
                    {msg.role === "assistant" ? (
                      <div className="relative group">
                        <div className="prose prose-slate max-w-none prose-p:leading-[1.8] prose-headings:text-slate-900 prose-strong:text-blue-600 break-words tracking-tight">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                        <button 
                          onClick={() => speak(msg.content.replace(/[*#_`]/g, ''))} 
                          className="absolute -right-2 -bottom-2 p-2.5 bg-blue-600 text-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap tracking-tight leading-relaxed">{msg.content}</div>
                    )}
                  </div>
                </div>

                {msg.role === "user" && (
                   <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg transform -translate-y-2">
                     <User size={22} />
                   </div>
                )}
              </div>
            ))}
            {isTyping && (
               <div className="flex justify-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                   <Loader2 className="animate-spin" size={20} />
                 </div>
                 <div className="bg-white border border-slate-100 p-5 rounded-3xl rounded-tl-none shadow-xl text-slate-400 text-sm font-bold tracking-widest uppercase italic flex items-center gap-3">
                   <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce delay-0" />
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce delay-150" />
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce delay-300" />
                   </div>
                   Synthesizing analysis...
                 </div>
               </div>
            )}
            <div ref={bottomRef} className="h-12" />
          </div>
        </div>

        {/* Input Dock */}
        <div className="p-6 bg-transparent relative z-10 w-full flex justify-center">
          <div className="w-full max-w-4xl flex flex-col gap-4 relative group">
            {attachment && (
              <div className="relative group animate-in slide-in-from-bottom-4 duration-500 w-fit">
                 {attachment.type === "image" ? (
                   <div className="relative h-24 w-24 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl">
                      <img src={attachment.previewUrl} alt="Preview" className="h-full w-full object-cover" />
                      <button onClick={() => setAttachment(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-rose-600 transition-colors shadow-lg"><X size={14}/></button>
                   </div>
                 ) : (
                   <div className="flex items-center gap-4 bg-white border-2 border-emerald-50 p-4 rounded-[1.5rem] shadow-2xl ring-1 ring-emerald-100">
                      <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <FileText size={22} />
                      </div>
                      <div className="flex flex-col pr-8">
                         <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Medical PDF</span>
                         <span className="text-sm font-extrabold text-slate-800 truncate max-w-[200px]">{attachment.name}</span>
                      </div>
                      <button onClick={() => setAttachment(null)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-600 transition-colors"><X size={18}/></button>
                   </div>
                 )}
              </div>
            )}

            <div className="flex items-end gap-3 bg-white border-2 border-slate-100 rounded-[2.5rem] p-3 pl-6 focus-within:ring-[12px] focus-within:ring-blue-600/5 focus-within:border-blue-600/30 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] transition-all duration-500 backdrop-blur-xl">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Describe your health concern in detail..."
                className="flex-1 max-h-48 min-h-[48px] bg-transparent resize-none outline-none py-3.5 text-[16px] text-slate-700 font-medium placeholder:text-slate-300 placeholder:font-bold placeholder:uppercase placeholder:text-[11px] placeholder:tracking-widest"
                rows={1}
              />
              <div className="flex gap-2 pb-1.5 pr-2">
                <button onClick={() => imageInputRef.current?.click()} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all" title="Attach Image"><ImageIcon size={22} /></button>
                <button onClick={() => pdfInputRef.current?.click()} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all" title="Attach Report"><FileText size={22} /></button>
                <button onClick={() => setLanguage(l => l === "en-US" ? "hi-IN" : "en-US")} className={`p-3 rounded-2xl font-black text-[10px] tracking-tighter transition-all ${language === "hi-IN" ? "bg-orange-100 text-orange-600" : "text-slate-400 hover:bg-slate-50"}`}>
                   {language === "hi-IN" ? "HI/IN" : "EN/US"}
                </button>
                <button 
                  onClick={toggleListening} 
                  className={`p-3 rounded-2xl shadow-lg transition-all active:scale-95 ${isListening ? "bg-rose-100 text-rose-600 shadow-rose-100 animate-pulse ring-4 ring-rose-50" : "text-slate-400 hover:bg-slate-50"}`}
                >
                  {isListening ? <StopCircle size={22} /> : <Mic size={22} />}
                </button>
                <button 
                  onClick={handleSend} 
                  disabled={(!input.trim() && !attachment) || isTyping} 
                  className="p-3.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-20 rounded-[1.5rem] shadow-2xl shadow-blue-300 transition-all active:scale-90 flex items-center justify-center min-w-[54px]"
                >
                  {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="translate-x-[1px]" />}
                </button>
              </div>
            </div>
            <div className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] opacity-80 flex items-center justify-center gap-2">
               <ChevronRight size={12} className="text-blue-500" /> AI powered medical guidance • not a substitute for clinical diagnosis
            </div>
          </div>
        </div>
      </main>

      {/* Global CSS for Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
          background-clip: content-box;
        }
      `}</style>
    </div>
  );
}
