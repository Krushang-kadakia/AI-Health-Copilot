import geocoder
import requests

def get_location():
    try:
        g = geocoder.ip('me')
        if g.latlng:
            return g.latlng[0], g.latlng[1], g.city
    except Exception:
        pass
    return None, None, None

def categorize_facility(name):
    name_lower = name.lower()
    
    gov_keywords = ["gov", "municipal", "public", "ministry", "state", "federal", "district", "civil hospital", "phc", "chc", "general hospital", "govt"]
    private_keywords = ["private", "apollo", "fortis", "max", "care", "trust", "corporate", "clinic"]

    for kw in gov_keywords:
        if kw in name_lower:
            return "Government"
    
    for kw in private_keywords:
        if kw in name_lower:
            return "Private"
            
    return "Private/Unclassified"

def get_google_places(lat, lon, api_key, radius=3000):
    """
    Search for nearby hospitals and pharmacies using Google Places API.
    """
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    
    facilities = {}
    
    # We make two requests: one for hospitals (which includes clinics) and one for pharmacies
    types = ["hospital", "pharmacy"]
    
    for place_type in types:
        params = {
            "location": f"{lat},{lon}",
            "radius": radius,
            "type": place_type,
            "key": api_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            
            if data.get("status") == "OK":
                for item in data.get("results", []):
                    place_id = item.get("place_id")
                    if place_id not in facilities:
                        facilities[place_id] = {
                            "name": item.get("name", "Unnamed Facility"),
                            "vicinity": item.get("vicinity", ""),
                            "location": {
                                "lat": item.get("geometry", {}).get("location", {}).get("lat"),
                                "lng": item.get("geometry", {}).get("location", {}).get("lng")
                            },
                            "rating": item.get("rating", "N/A"),
                            "open_now": item.get("opening_hours", {}).get("open_now", None),
                            "types": item.get("types", [])
                        }
            elif data.get("status") != "ZERO_RESULTS":
                raise ValueError(f"Google Maps API Error: {data.get('status')} - {data.get('error_message', 'No error message provided')}")
        except Exception as e:
            raise RuntimeError(f"Failed to fetch nearby facilities from Google Maps: {str(e)}")
            
    return list(facilities.values())

def render():
    st.header("Nearby Hospital and Pharmacy Finder 🏥 (Google Maps)")
    st.write("Using your IP-based location and Google Maps to find the closest medical facilities.")
    
    api_key = st.text_input("Enter your Google Maps API Key:", type="password")
    
    # Simple help text for users who might not have a key handy
    with st.expander("How to get a Google Maps API Key"):
        st.markdown("[Click here to read the docs on getting a Google Maps Javascript API Key](https://developers.google.com/maps/documentation/places/web-service/get-api-key). Ensure the 'Places API' is enabled.")

    if st.button("Locate Nearby Facilities"):
        if not api_key:
            st.warning("Please enter a valid Google Maps API Key.")
            return
            
        with st.spinner("Detecting your location..."):
            lat, lon, city = get_location()
            
        if lat and lon:
            st.success(f"Location detected: Lat {lat:.4f}, Lon {lon:.4f} (approx. {city})")
            
            with st.spinner("Searching for hospitals and pharmacies within 3km using Google Maps..."):
                facilities = get_google_places(lat, lon, api_key)
                
            if facilities:
                st.subheader(f"Found {len(facilities)} Medical Facilities Nearby:")
                
                # Segregate facilities
                gov_facilities = []
                pvt_facilities = []
                
                for facility in facilities:
                    category = categorize_facility(facility["name"])
                    if category == "Government":
                        gov_facilities.append(facility)
                    else:
                        pvt_facilities.append(facility)
                        
                def display_facility_list(fac_list, category_name):
                    if fac_list:
                        st.markdown(f"### {category_name} Facilities ({len(fac_list)})")
                        for index, facility in enumerate(fac_list, 1):
                            name = facility["name"]
                            vicinity = facility["vicinity"]
                            rating = facility["rating"]
                            
                            st.markdown(f"**{index}. {name}** (Rating: {rating} ⭐)")
                            
                            details_str = []
                            if vicinity:
                                details_str.append(f"📍 {vicinity}")
                                
                            if facility["open_now"] is not None:
                                status = "Open Now" if facility["open_now"] else "Closed"
                                details_str.append(f"🕒 {status}")
                                
                            if details_str:
                                st.write(" | ".join(details_str))
                            
                            # Generate a Google Maps link for directions using coordinates
                            f_lat = facility["location"]["lat"]
                            f_lng = facility["location"]["lng"]
                            link = f"https://www.google.com/maps/dir/?api=1&destination={f_lat},{f_lng}"
                            st.markdown(f"[View Directions on Maps]({link})")
                        st.divider()

                display_facility_list(gov_facilities, "Government")
                display_facility_list(pvt_facilities, "Private & Others")

            else:
                st.info("No hospitals or pharmacies found within a 3km radius.")
        else:
            st.error("Could not automatically detect location. Please check your internet connection or firewall rules.")
