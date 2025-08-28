const express = require("express");
const { body, validationResult } = require("express-validator");
const { 
  generateTextWithGemini, 
  getCoordinatesFromOpenCage, 
  calculateDistance, 
  estimateTravelTime 
} = require("../config/gemini");
const pool = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Helper function to safely parse JSON with multiple strategies
function safeJsonParse(text) {
  // Strategy 1: Try parsing the raw text first
  try {
    return JSON.parse(text);
  } catch (error) {
    console.log("Strategy 1 failed, trying cleanup...");
  }

  // Strategy 2: Clean and extract JSON
  try {
    let cleanedText = text.trim();

    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    // Find JSON object boundaries
    const jsonStart = cleanedText.indexOf("{");
    const jsonEnd = cleanedText.lastIndexOf("}") + 1;

    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd);
    }

    // Try parsing the extracted JSON
    return JSON.parse(cleanedText);
  } catch (error) {
    console.log("Strategy 2 failed, trying aggressive cleanup...");
  }

  // Strategy 3: Aggressive cleanup (only if previous strategies fail)
  try {
    let cleanedText = text.trim();

    // Remove markdown
    cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    // Extract JSON
    const jsonStart = cleanedText.indexOf("{");
    const jsonEnd = cleanedText.lastIndexOf("}") + 1;

    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd);
    }

    // Fix common JSON issues
    cleanedText = cleanedText
      // Fix trailing commas
      .replace(/,(\s*[}\]])/g, "$1")
      // Fix missing quotes around property names
      .replace(/(\w+):\s*([^",{[\s][^,}\]]*)/g, '"$1": "$2"');

    return JSON.parse(cleanedText);
  } catch (error) {
    console.log("All parsing strategies failed:", error.message);
    throw new Error("Unable to parse JSON response");
  }
}

// Generate realistic intermediate stops
async function generateIntermediateStops(startCoords, destCoords, duration) {
  const stops = [];
  
  if (duration <= 2) {
    return stops; // No intermediate stops for short trips
  }

  const distance = calculateDistance(startCoords.lat, startCoords.lng, destCoords.lat, destCoords.lng);
  
  // Add intermediate stops every 200-300 km or based on duration
  const numberOfStops = Math.min(duration - 2, Math.floor(distance / 250));
  
  for (let i = 1; i <= numberOfStops; i++) {
    const factor = i / (numberOfStops + 1);
    const intermediateLat = startCoords.lat + (destCoords.lat - startCoords.lat) * factor;
    const intermediateLng = startCoords.lng + (destCoords.lng - startCoords.lng) * factor;
    
    // Add some variation to make stops more realistic
    const variation = 0.2;
    const variedLat = intermediateLat + (Math.random() - 0.5) * variation;
    const variedLng = intermediateLng + (Math.random() - 0.5) * variation;
    
    stops.push({
      lat: variedLat,
      lng: variedLng,
      day: i + 1
    });
  }
  
  return stops;
}

// Generate itinerary endpoint
router.post(
  "/generate",
  authenticateToken,
  [
    body("startLocation").trim().isLength({ min: 1 }).withMessage("Start location is required"),
    body("destination").trim().isLength({ min: 1 }).withMessage("Destination is required"),
    body("startDate").isISO8601().withMessage("Valid start date is required"),
    body("endDate").isISO8601().withMessage("Valid end date is required"),
    body("travelers").isInt({ min: 1, max: 20 }).withMessage("Travelers must be between 1 and 20"),
    body("budgetLevel").isIn(["low", "medium", "high"]).withMessage("Invalid budget level"),
    body("interests").optional().isArray().withMessage("Interests must be an array"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const {
        startLocation,
        destination,
        startDate,
        endDate,
        travelers,
        budgetLevel,
        interests = [],
        additionalRequests = "",
      } = req.body;

      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();

      if (start < today) {
        return res.status(400).json({ error: "Start date cannot be in the past" });
      }

      if (end <= start) {
        return res.status(400).json({ error: "End date must be after start date" });
      }

      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (duration > 30) {
        return res.status(400).json({ error: "Trip duration cannot exceed 30 days" });
      }

      console.log("Fetching coordinates for start and destination locations...");

      // Get accurate coordinates using OpenCage
      let startCoords, destCoords;
      try {
        [startCoords, destCoords] = await Promise.all([
          getCoordinatesFromOpenCage(startLocation),
          getCoordinatesFromOpenCage(destination)
        ]);
        
        console.log("Start coordinates:", startCoords);
        console.log("Destination coordinates:", destCoords);
      } catch (coordError) {
        console.error("Coordinate fetch error:", coordError);
        return res.status(400).json({ 
          error: "Unable to locate one or both destinations", 
          message: "Please check the location names and try again" 
        });
      }

      // Calculate actual distance and travel time
      const totalDistance = calculateDistance(startCoords.lat, startCoords.lng, destCoords.lat, destCoords.lng);
      const totalTravelTime = estimateTravelTime(totalDistance);

      // Generate intermediate stops for realistic routing
      const intermediateStops = await generateIntermediateStops(startCoords, destCoords, duration);

      // Create enhanced prompt for Gemini with geographical context
      const budgetRanges = {
        low: "₹2,000-4,000 per day",
        medium: "₹4,000-8,000 per day",
        high: "₹8,000+ per day",
      };

      const prompt = `Create a detailed ${duration}-day road trip itinerary from ${startLocation} to ${destination} in India for ${travelers} traveler(s).

GEOGRAPHICAL CONTEXT:
- Start: ${startCoords.formatted} (${startCoords.lat}, ${startCoords.lng})
- Destination: ${destCoords.formatted} (${destCoords.lat}, ${destCoords.lng})
- Total Distance: ${Math.round(totalDistance)} km
- Estimated Total Travel Time: ${totalTravelTime}

TRIP DETAILS:
- Start Date: ${startDate}
- End Date: ${endDate}
- Budget: ${budgetLevel} (${budgetRanges[budgetLevel]})
- Interests: ${interests.join(", ") || "General sightseeing"}
- Special Requests: ${additionalRequests || "None"}

GEOGRAPHICAL ACCURACY REQUIREMENTS:
1. Plan realistic stops along the actual route between these coordinates
2. Consider actual driving distances and times
3. Don't suggest places that are too far off the route (max 50km detour)
4. Each day should have 200-400km maximum travel distance
5. Include major cities/towns along the route as overnight stops

ITINERARY REQUIREMENTS:
1. Provide a brief 2-3 sentence trip summary
2. Create day-by-day itinerary with specific timings (use "09:00 AM", "02:00 PM", "07:00 PM" format)
3. Include realistic travel times between locations
4. Focus on places actually accessible from the route
5. Each activity must have: time, activity, location, description

CRITICAL: Return ONLY valid JSON without any markdown formatting, code blocks, explanations, or additional text. Use this exact format:

{
  "summary": "Brief engaging trip overview highlighting the route and key destinations",
  "total_distance": "${Math.round(totalDistance)} km",
  "total_travel_time": "${totalTravelTime}",
  "estimated_cost": "₹X - ₹Y per person for ${duration} days",
  "days": [
    {
      "day": 1,
      "date": "${start.toISOString().split("T")[0]}",
      "start_location": "${startLocation}",
      "end_location": "First day destination",
      "distance_km": 0,
      "activities": [
        {
          "time": "09:00 AM",
          "activity": "Departure preparation",
          "location": "${startLocation}",
          "description": "Detailed description with local insights"
        }
      ]
    }
  ]
}

Create realistic day-wise progression from ${startLocation} to ${destination} considering actual road networks and travel times.`;

      console.log("Generating itinerary with Gemini AI...");

      // Generate itinerary using Gemini
      const text = await generateTextWithGemini(prompt, {
        maxTokens: 4000,
        temperature: 0.7
      });

      console.log("Gemini response received, parsing...");
      console.log("Raw response length:", text.length);
      console.log("Raw response:", text);

      // Parse Gemini response with improved error handling
      let itinerary;
      try {
        // Use the safe JSON parser
        itinerary = safeJsonParse(text);

        console.log("JSON parsed successfully!");

        // Validate and enhance the structure
        if (!itinerary.summary || !itinerary.days || !Array.isArray(itinerary.days)) {
          throw new Error("Invalid itinerary structure from Gemini");
        }

        // Clean and validate each day
        itinerary.days = itinerary.days.map((day, index) => {
          const dayDate = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);

          return {
            day: index + 1,
            date: dayDate.toISOString().split("T")[0],
            start_location: day.start_location || (index === 0 ? startLocation : "Previous day location"),
            end_location: day.end_location || (index === duration - 1 ? destination : "Next stop"),
            distance_km: day.distance_km || Math.round(totalDistance / duration),
            activities: Array.isArray(day.activities)
              ? day.activities.map((activity) => ({
                  time: activity.time || "09:00 AM",
                  activity: activity.activity || `Day ${index + 1} activity`,
                  location: activity.location || day.start_location || startLocation,
                  description: activity.description || "Explore local attractions and enjoy authentic experiences.",
                }))
              : [
                  {
                    time: "09:00 AM",
                    activity: `Day ${index + 1} activities`,
                    location: index === 0 ? startLocation : index === duration - 1 ? destination : "En route",
                    description: "Detailed itinerary based on your preferences and route.",
                  },
                ],
          };
        });

        // Ensure we have the right number of days
        while (itinerary.days.length < duration) {
          const dayIndex = itinerary.days.length;
          const dayDate = new Date(start.getTime() + dayIndex * 24 * 60 * 60 * 1000);
          itinerary.days.push({
            day: dayIndex + 1,
            date: dayDate.toISOString().split("T")[0],
            start_location: dayIndex === duration - 1 ? "Final approach" : "En route",
            end_location: dayIndex === duration - 1 ? destination : "Next destination",
            distance_km: Math.round(totalDistance / duration),
            activities: [
              {
                time: "09:00 AM",
                activity: `Day ${dayIndex + 1} journey`,
                location: dayIndex === duration - 1 ? destination : "En route destinations",
                description: "Continue your journey with planned stops and sightseeing.",
              },
              {
                time: "02:00 PM",
                activity: "Lunch and exploration",
                location: "Local restaurant and attractions",
                description: "Enjoy regional cuisine and explore nearby points of interest.",
              },
              {
                time: "07:00 PM",
                activity: "Evening rest",
                location: "Hotel/accommodation",
                description: "Check in and enjoy local dinner options.",
              },
            ],
          });
        }

        // Ensure required string fields exist with better defaults
        itinerary.summary = itinerary.summary || `A ${duration}-day road trip from ${startLocation} to ${destination} covering ${Math.round(totalDistance)} km through diverse Indian landscapes.`;
        itinerary.total_distance = `${Math.round(totalDistance)} km`;
        itinerary.total_travel_time = totalTravelTime;
        itinerary.estimated_cost = itinerary.estimated_cost ||
          `₹${budgetLevel === "low" ? "15,000-30,000" : budgetLevel === "medium" ? "30,000-60,000" : "60,000-120,000"} per person`;

        console.log("Itinerary structure validated and enhanced successfully");
      } catch (parseError) {
        console.error("JSON parsing failed:", parseError.message);
        console.log("Raw Gemini response:", text.substring(0, 1000) + "...");

        // Enhanced fallback itinerary with geographical accuracy
        console.log("Using geographically-aware fallback itinerary...");
        itinerary = {
          summary: `A ${duration}-day road trip from ${startCoords.formatted} to ${destCoords.formatted}, covering approximately ${Math.round(totalDistance)} km through India's diverse landscapes and cultural heritage.`,
          total_distance: `${Math.round(totalDistance)} km`,
          total_travel_time: totalTravelTime,
          estimated_cost: `₹${budgetLevel === "low" ? "15,000-30,000" : budgetLevel === "medium" ? "30,000-60,000" : "60,000-120,000"} per person`,
          days: Array.from({ length: duration }, (_, i) => {
            const dayDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            const isFirstDay = i === 0;
            const isLastDay = i === duration - 1;
            const dayDistance = Math.round(totalDistance / duration);

            return {
              day: i + 1,
              date: dayDate.toISOString().split("T")[0],
              start_location: isFirstDay ? startLocation : "Previous location",
              end_location: isLastDay ? destination : "Next destination", 
              distance_km: isFirstDay ? 0 : dayDistance,
              activities: [
                {
                  time: "09:00 AM",
                  activity: isFirstDay
                    ? `Departure from ${startLocation}`
                    : isLastDay
                      ? `Arrival in ${destination}`
                      : `Day ${i + 1} journey`,
                  location: isFirstDay ? startLocation : isLastDay ? destination : "En route",
                  description: isFirstDay
                    ? `Begin your road trip from ${startCoords.formatted}. Check your vehicle and start the journey.`
                    : isLastDay
                      ? `Reach ${destCoords.formatted}. Explore main attractions based on your interests.`
                      : `Travel approximately ${dayDistance} km with scenic stops and local attractions.`,
                },
                {
                  time: "02:00 PM",
                  activity: "Lunch and local exploration",
                  location: "Local restaurant and attractions",
                  description: "Experience regional cuisine and explore cultural sites along the route.",
                },
                {
                  time: "07:00 PM",
                  activity: "Evening accommodation",
                  location: "Hotel/guest house",
                  description: "Check into accommodation and enjoy local dinner specialties.",
                },
              ],
            };
          }),
        };
      }

      // Generate enhanced route coordinates
      const routeCoordinates = await generateEnhancedRouteCoordinates(startCoords, destCoords, intermediateStops);

      // Save trip to database
      const tripTitle = `${startLocation} to ${destination}`;
      const insertResult = await pool.query(
        `INSERT INTO trips (user_id, title, start_location, destination, start_date, end_date, travelers, interests, budget_level, itinerary, route_coordinates) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING id`,
        [
          req.user.id,
          tripTitle,
          startLocation,
          destination,
          startDate,
          endDate,
          travelers,
          interests,
          budgetLevel,
          JSON.stringify(itinerary),
          JSON.stringify(routeCoordinates),
        ],
      );

      const tripId = insertResult.rows[0].id;

      console.log(`Geographically accurate itinerary generated and saved with ID: ${tripId}`);

      res.status(201).json({
        message: "Itinerary generated successfully",
        tripId,
        itinerary,
        route_info: {
          total_distance: Math.round(totalDistance),
          total_travel_time: totalTravelTime,
          intermediate_stops: intermediateStops.length
        }
      });
    } catch (error) {
      console.error("Itinerary generation error:", error);

      // Handle specific Gemini errors
      if (error.message.includes("Rate limit exceeded")) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          message: "Please wait a few minutes before generating another itinerary.",
        });
      }

      if (error.message.includes("API key")) {
        return res.status(500).json({
          error: "AI service configuration error",
          message: "Please contact support if this issue persists.",
        });
      }

      if (error.message.includes("safety filters")) {
        return res.status(400).json({
          error: "Content filtered",
          message: "Please try with different locations or modify your request.",
        });
      }

      if (error.message.includes("quota") || error.message.includes("unavailable")) {
        return res.status(503).json({
          error: "Service temporarily unavailable",
          message: "AI service quota exceeded. Please try again later.",
        });
      }

      res.status(500).json({
        error: "Failed to generate itinerary",
        message: "Please try again or contact support if the problem persists",
      });
    }
  },
);

// Helper function to generate enhanced route coordinates
async function generateEnhancedRouteCoordinates(startCoords, destCoords, intermediateStops) {
  const route = [[startCoords.lat, startCoords.lng]];

  // Add intermediate stops
  for (const stop of intermediateStops) {
    route.push([stop.lat, stop.lng]);
  }

  // Add destination
  route.push([destCoords.lat, destCoords.lng]);

  return route;
}

// Health check endpoint for Gemini
router.get("/health", async (req, res) => {
  try {
    const { checkGeminiStatus } = require("../config/gemini");
    const status = await checkGeminiStatus();

    res.json({
      service: "Itinerary Generation",
      gemini_status: status.status,
      message: status.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      service: "Itinerary Generation",
      gemini_status: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;