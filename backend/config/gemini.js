const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to generate text with Gemini
async function generateTextWithGemini(prompt, options = {}) {
  try {
    // Use gemini-pro for free tier
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const generationConfig = {
      temperature: options.temperature || 0.7,
      topK: options.topK || 1,
      topP: options.topP || 1,
      maxOutputTokens: options.maxTokens || 3500,
    };

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: `You are a travel expert specializing in Indian road trips. You must return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Be geographically accurate and create realistic itineraries based on actual distances and travel times.\n\n${prompt}`
        }]
      }],
      generationConfig,
    });

    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("No response generated from Gemini");
    }

    return text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);

    // Handle rate limiting
    if (error.status === 429 || error.message.includes('quota')) {
      throw new Error("Rate limit exceeded. Please try again in a few minutes.");
    }

    // Handle API key issues
    if (error.status === 401 || error.status === 403) {
      throw new Error("Invalid Gemini API key. Please check your configuration.");
    }

    // Handle safety filters
    if (error.message.includes('SAFETY') || error.message.includes('blocked')) {
      throw new Error("Content was blocked by safety filters. Please try with different locations or requests.");
    }

    // Handle other errors
    if (error.status >= 500) {
      throw new Error("Gemini service temporarily unavailable. Please try again later.");
    }

    throw new Error(`Gemini API error: ${error.message}`);
  }
}

// Helper function to check API status
async function checkGeminiStatus() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Test");
    const response = await result.response;
    const text = response.text();
    
    return { status: "ok", message: "Gemini API is working" };
  } catch (error) {
    return {
      status: "error",
      message: error.message,
      statusCode: error.status,
    };
  }
}

// Helper function to get coordinates using OpenCage API with fallback
async function getCoordinatesFromOpenCage(location) {
  let query = location;
  if (!/india/i.test(location)) {
    query = `${location}, India`; // ensure Indian context
  }

  try {
    // 1. Try OpenCage
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${process.env.OPENCAGE_API_KEY}&countrycode=in&limit=1`
    );

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.lat,
        lng: result.geometry.lng,
        formatted: result.formatted,
        components: result.components
      };
    }
  } catch (error) {
    console.error(`OpenCage API Error for ${location}:`, error.message);
  }

  try {
    // 2. Fallback: Nominatim (OpenStreetMap)
    const nominatimRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "TripNect/1.0 (ojasbhosale07@gmail.com)" } } // required
    );

    const nominatimData = await nominatimRes.json();

    if (nominatimData && nominatimData.length > 0) {
      return {
        lat: parseFloat(nominatimData[0].lat),
        lng: parseFloat(nominatimData[0].lon),
        formatted: nominatimData[0].display_name,
        components: {}
      };
    }
  } catch (error) {
    console.error(`Nominatim API Error for ${location}:`, error.message);
  }

  // 3. Fallback to India center
  console.warn(`No coordinates found for: ${location}, defaulting to India center`);
  return {
    lat: 20.5937,
    lng: 78.9629,
    formatted: "India (default fallback)",
    components: {}
  };
}


// Fallback coordinates for major Indian cities
function getFallbackCoordinates(location) {
  const locationKey = location.toLowerCase().trim();
  const fallbackMap = {
    'mumbai': { lat: 19.076, lng: 72.8777, formatted: 'Mumbai, Maharashtra, India' },
    'delhi': { lat: 28.6139, lng: 77.209, formatted: 'Delhi, India' },
    'bangalore': { lat: 12.9716, lng: 77.5946, formatted: 'Bangalore, Karnataka, India' },
    'bengaluru': { lat: 12.9716, lng: 77.5946, formatted: 'Bengaluru, Karnataka, India' },
    'chennai': { lat: 13.0827, lng: 80.2707, formatted: 'Chennai, Tamil Nadu, India' },
    'kolkata': { lat: 22.5726, lng: 88.3639, formatted: 'Kolkata, West Bengal, India' },
    'hyderabad': { lat: 17.385, lng: 78.4867, formatted: 'Hyderabad, Telangana, India' },
    'pune': { lat: 18.5204, lng: 73.8567, formatted: 'Pune, Maharashtra, India' },
    'jaipur': { lat: 26.9124, lng: 75.7873, formatted: 'Jaipur, Rajasthan, India' },
    'goa': { lat: 15.2993, lng: 74.124, formatted: 'Goa, India' },
    'kedarnath': { lat: 30.7338877, lng: 79.0669073, formatted: 'Kedarnath, Uttarakhand, India' },
    'haridwar': { lat: 29.9457, lng: 78.1642, formatted: 'Haridwar, Uttarakhand, India' },
    'rishikesh': { lat: 30.0869, lng: 78.2676, formatted: 'Rishikesh, Uttarakhand, India' },
    'dehradun': { lat: 30.3165, lng: 78.0322, formatted: 'Dehradun, Uttarakhand, India' }
  };
  
  return fallbackMap[locationKey] || null;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Estimate travel time based on distance (rough estimate for Indian roads)
function estimateTravelTime(distanceKm) {
  // Average speed on Indian roads: 40-60 km/h depending on road conditions
  const averageSpeed = 50; // km/h
  const hours = distanceKm / averageSpeed;
  const totalMinutes = Math.round(hours * 60);
  
  const hoursDisplay = Math.floor(totalMinutes / 60);
  const minutesDisplay = totalMinutes % 60;
  
  if (hoursDisplay > 0) {
    return `${hoursDisplay}h ${minutesDisplay}m`;
  }
  return `${minutesDisplay}m`;
}

module.exports = {
  genAI,
  generateTextWithGemini,
  checkGeminiStatus,
  getCoordinatesFromOpenCage,
  calculateDistance,
  estimateTravelTime,
  getFallbackCoordinates
};