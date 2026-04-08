import { useEffect, useState } from "react";
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { Loader2 } from "lucide-react";

// User must provide this key in frontend/.env
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export default function NearbyHelp() {
  // Default to a central location, ideally we'll wire HTML5 Geolocation up during Phase 4 logic
  const [position, setPosition] = useState({ lat: 28.6139, lng: 77.2090 });
  const [facilities, setFacilities] = useState<{ government: any[], private: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"detecting" | "found" | "denied" | "error">("detecting");

  // Fetch current location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
       setLocationStatus("error");
       return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        setLocationStatus("found");
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocationStatus("denied"); // Default to Delhi
      }
    );
  }, []);

  // Fetch facilities whenever position changes
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/hospitals?lat=${position.lat}&lon=${position.lng}&api_key=${GOOGLE_MAPS_API_KEY}`)
      .then(res => res.json())
      .then(data => setFacilities(data))
      .catch(err => console.error("Error fetching hospitals:", err))
      .finally(() => setLoading(false));
  }, [position]);
  
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6 pb-6 animate-in fade-in duration-500 overflow-hidden">
       {/* Header with Search Context */}
       <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
         <div className="max-w-2xl">
           <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Nearby Help</h1>
           <p className="text-slate-500">
             {locationStatus === "detecting" ? "Detecting your current coordinates..." : 
              locationStatus === "denied" ? "Location access denied. Showing results for Delhi region." :
              "Discovering medical facilities immediately surrounding your position."}
           </p>
         </div>
         {GOOGLE_MAPS_API_KEY && (
           <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold ring-1 ring-blue-700/10">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              Scanning Within 3km
           </div>
         )}
       </div>
       
       <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Map Container - Flexible height on mobile, fixed width on desktop */}
          <div className="lg:w-2/3 h-[350px] lg:h-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 relative shrink-0">
            {!GOOGLE_MAPS_API_KEY ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/95 backdrop-blur z-20 border-4 border-dashed border-amber-200 text-slate-500 m-8 rounded-3xl shadow-sm">
                  <h2 className="text-xl font-bold text-slate-800 mb-2">API Key Required</h2>
                  <p className="max-w-md mb-2 text-sm">A restricted Google Cloud key is required to load map geometry and markers.</p>
                  <p className="max-w-md text-xs bg-slate-100 p-3 rounded-xl border border-slate-200 font-mono">VITE_GOOGLE_MAPS_API_KEY=your_key</p>
                </div>
            ) : loading && !facilities ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/50 backdrop-blur-sm">
                    <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                    <span className="text-slate-700 font-medium tracking-tight">Initializing Map...</span>
                </div>
            ) : null}
            
            <div className="w-full h-full relative z-0">
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                  <Map center={position} defaultZoom={13} minZoom={10} gestureHandling="greedy" mapId="DEMO_MAP_ID">
                    <Marker position={position} title="Your Location" />
                    
                    {/* Render Private Facilities */}
                    {facilities?.private?.map((fac: any, idx) => (
                      <Marker key={`pvt-${idx}`} position={{ lat: fac.location.lat, lng: fac.location.lng }} title={`[Private] ${fac.name}`} icon={{ url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }} />
                    ))}

                    {/* Render Government Facilities */}
                    {facilities?.government?.map((fac: any, idx) => (
                      <Marker key={`gov-${idx}`} position={{ lat: fac.location.lat, lng: fac.location.lng }} title={`[Govt] ${fac.name}`} icon={{ url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }} />
                    ))}
                  </Map>
              </APIProvider>
            </div>
          </div>

          {/* List Container - Scrollable section */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  Results
                  <span className="text-xs py-0.5 px-2 bg-slate-200 rounded-full text-slate-600">
                    {(facilities?.government.length || 0) + (facilities?.private.length || 0)}
                  </span>
                </h3>
                {loading && <Loader2 className="animate-spin text-slate-400" size={16} />}
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {!GOOGLE_MAPS_API_KEY ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                     <p className="text-sm">Please configure your API key to view the facility details list.</p>
                  </div>
                ) : facilities && (facilities.government.length + facilities.private.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                     <p className="text-sm">No medical facilities found within 3km of your current location.</p>
                  </div>
                ) : (
                  <>
                    {/* Render Government Section */}
                    {facilities?.government?.map((fac: any, idx) => (
                      <FacilityCard key={`list-gov-${idx}`} facility={fac} type="government" />
                    ))}
                    {/* Render Private Section */}
                    {facilities?.private?.map((fac: any, idx) => (
                      <FacilityCard key={`list-pvt-${idx}`} facility={fac} type="private" />
                    ))}
                  </>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}

// Helper component for facility cards
function FacilityCard({ facility, type }: { facility: any, type: "government" | "private" }) {
  const isGov = type === "government";
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.location.lat},${facility.location.lng}`;

  return (
    <div className="p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
      <div className="flex justify-between items-start gap-3 mb-2">
        <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{facility.name}</h4>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${isGov ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {isGov ? 'Govt' : 'Private'}
        </span>
      </div>
      
      <p className="text-sm text-slate-500 mb-3 line-clamp-2">{facility.vicinity || "Address unavailable"}</p>
      
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-1">
            <span className="text-amber-400 text-sm">★</span>
            <span className="text-sm font-medium text-slate-700">{facility.rating || "N/A"}</span>
         </div>
         <a 
           href={directionsUrl}
           target="_blank"
           rel="noopener noreferrer"
           className="text-xs font-semibold px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-colors"
         >
           Directions
         </a>
      </div>
    </div>
  );
}
