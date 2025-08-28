const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to generate text with OpenAI
async function generateTextWithOpenAI(prompt, options = {}) {
  try {
    const response = await openai.chat.completions.create({
      model:  "gpt-4o-mini", // Use gpt-4 for better results if budget allows
      messages: [
        {
          role: "system",
          content: "You are a travel expert specializing in Indian road trips. You must return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Be geographically accurate and create realistic itineraries based on actual distances and travel times."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || 3500,
      temperature: options.temperature || 0.7,
      response_format: { type: "json_object" } // This ensures JSON output
    });

    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content.trim();
    } else {
      throw new Error("No response generated from OpenAI");
    }
  } catch (error) {
    console.error("OpenAI API Error:", error);

    // Handle rate limiting
    if (error.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a few minutes.");
    }

    // Handle API key issues
    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your configuration.");
    }

    // Handle insufficient quota
    if (error.status === 402 || error.code === 'insufficient_quota') {
      throw new Error("OpenAI API quota exceeded. Please check your billing or try again later.");
    }

    // Handle context length exceeded
    if (error.code === 'context_length_exceeded') {
      throw new Error("Request too long. Please reduce the trip duration or details.");
    }

    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

// Helper function to check API status
async function checkOpenAIStatus() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Test" }],
      max_tokens: 10,
    });
    return { status: "ok", message: "OpenAI API is working" };
  } catch (error) {
    return {
      status: "error",
      message: error.message,
      statusCode: error.status,
    };
  }
}

// Helper function to get coordinates using OpenCage API
async function getCoordinatesFromOpenCage(location) {
  try {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&key=${process.env.OPENCAGE_API_KEY}&countrycode=in&limit=1`
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
    
    throw new Error(`No coordinates found for: ${location}`);
  } catch (error) {
    console.error(`OpenCage API Error for ${location}:`, error);
    // Return fallback coordinates for major Indian cities
    const fallbackCoords = getFallbackCoordinates(location);
    if (fallbackCoords) {
      return fallbackCoords;
    }
    throw error;
  }
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
    'goa': { lat: 15.2993, lng: 74.124, formatted: 'Goa, India' }
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
  openai,
  generateTextWithOpenAI,
  checkOpenAIStatus,
  getCoordinatesFromOpenCage,
  calculateDistance,
  estimateTravelTime,
  getFallbackCoordinates
};