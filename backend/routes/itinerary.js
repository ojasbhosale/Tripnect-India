const express = require("express")
const { body, validationResult } = require("express-validator")
const { generateTextWithCohere } = require("../config/cohere")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Helper function to safely parse JSON with multiple strategies
function safeJsonParse(text) {
  // Strategy 1: Try parsing the raw text first
  try {
    return JSON.parse(text)
  } catch (error) {
    console.log("Strategy 1 failed, trying cleanup...")
  }

  // Strategy 2: Clean and extract JSON
  try {
    let cleanedText = text.trim()

    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*/g, "")

    // Find JSON object boundaries
    const jsonStart = cleanedText.indexOf("{")
    const jsonEnd = cleanedText.lastIndexOf("}") + 1

    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd)
    }

    // Try parsing the extracted JSON
    return JSON.parse(cleanedText)
  } catch (error) {
    console.log("Strategy 2 failed, trying aggressive cleanup...")
  }

  // Strategy 3: Aggressive cleanup (only if previous strategies fail)
  try {
    let cleanedText = text.trim()

    // Remove markdown
    cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*/g, "")

    // Extract JSON
    const jsonStart = cleanedText.indexOf("{")
    const jsonEnd = cleanedText.lastIndexOf("}") + 1

    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd)
    }

    // Only apply fixes if the JSON is clearly malformed
    if (!cleanedText.includes('"time":') || cleanedText.includes('time": "')) {
      // Apply minimal fixes
      cleanedText = cleanedText
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, "$1")
        // Fix missing quotes around property names (only if needed)
        .replace(/(\w+):\s*([^",{[\s][^,}\]]*)/g, '"$1": "$2"')
    }

    return JSON.parse(cleanedText)
  } catch (error) {
    console.log("All parsing strategies failed:", error.message)
    throw new Error("Unable to parse JSON response")
  }
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
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
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
      } = req.body

      // Validate date range
      const start = new Date(startDate)
      const end = new Date(endDate)
      const today = new Date()

      if (start < today) {
        return res.status(400).json({ error: "Start date cannot be in the past" })
      }

      if (end <= start) {
        return res.status(400).json({ error: "End date must be after start date" })
      }

      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      if (duration > 30) {
        return res.status(400).json({ error: "Trip duration cannot exceed 30 days" })
      }

      // Create optimized prompt for Cohere
      const budgetRanges = {
        low: "₹1,000-3,000 per day",
        medium: "₹3,000-7,000 per day",
        high: "₹7,000+ per day",
      }

      const prompt = `Create a detailed ${duration}-day road trip itinerary from ${startLocation} to ${destination} in India for ${travelers} traveler(s).

TRIP DETAILS:
- Start Date: ${startDate}
- End Date: ${endDate}
- Budget: ${budgetLevel} (${budgetRanges[budgetLevel]})
- Interests: ${interests.join(", ") || "General sightseeing"}
- Special Requests: ${additionalRequests || "None"}

REQUIREMENTS:
1. Provide a brief 2-3 sentence trip summary
2. Create day-by-day itinerary with specific timings (use "09:00 AM", "02:00 PM", "07:00 PM" format)
3. Include popular attractions, local food, cultural experiences
4. Estimate total distance and cost breakdown
5. Consider realistic travel times between locations
6. Focus on authentic Indian experiences
7. Each activity must have: time, activity, location, description

STRICT JSON FORMAT REQUIRED:
{
  "summary": "Brief engaging trip overview in 2-3 sentences",
  "total_distance": "Approximate distance in km",
  "estimated_cost": "₹X - ₹Y per person for ${duration} days",
  "days": [
    {
      "day": 1,
      "date": "${start.toISOString().split("T")[0]}",
      "activities": [
        {
          "time": "09:00 AM",
          "activity": "Specific activity name",
          "location": "Exact location name",
          "description": "Detailed description with local tips"
        },
        {
          "time": "02:00 PM",
          "activity": "Afternoon activity",
          "location": "Location name",
          "description": "Activity description"
        },
        {
          "time": "07:00 PM",
          "activity": "Evening activity",
          "location": "Location name", 
          "description": "Evening plans"
        }
      ]
    }
  ]
}

CRITICAL: Return ONLY the JSON object. No markdown, no code blocks, no additional text. All property names and string values must be properly quoted. Each activity MUST have all 4 fields: time, activity, location, description.`

      console.log("Generating itinerary with Cohere...")

      // Generate itinerary using Cohere
      const text = await generateTextWithCohere(prompt, {
        maxTokens: 3500,
        temperature: 0.7,
      })

      console.log("Cohere response received, parsing...")
      console.log("Raw response length:", text.length)

      // Parse Cohere response with improved error handling
      let itinerary
      try {
        // Use the safe JSON parser
        itinerary = safeJsonParse(text)

        console.log("JSON parsed successfully!")

        // Validate and fix the structure
        if (!itinerary.summary || !itinerary.days || !Array.isArray(itinerary.days)) {
          throw new Error("Invalid itinerary structure from Cohere")
        }

        // Clean and validate each day
        itinerary.days = itinerary.days.map((day, index) => {
          const dayDate = new Date(start.getTime() + index * 24 * 60 * 60 * 1000)

          return {
            day: index + 1,
            date: dayDate.toISOString().split("T")[0],
            activities: Array.isArray(day.activities)
              ? day.activities.map((activity) => ({
                  time: activity.time || "09:00 AM",
                  activity: activity.activity || `Day ${index + 1} activity`,
                  location: activity.location || "Location TBD",
                  description: activity.description || "Explore local attractions and enjoy authentic experiences.",
                }))
              : [
                  {
                    time: "09:00 AM",
                    activity: `Day ${index + 1} activities`,
                    location: index === 0 ? startLocation : index === duration - 1 ? destination : "En route",
                    description: "Detailed itinerary based on your preferences.",
                  },
                ],
          }
        })

        // Ensure we have the right number of days
        while (itinerary.days.length < duration) {
          const dayIndex = itinerary.days.length
          const dayDate = new Date(start.getTime() + dayIndex * 24 * 60 * 60 * 1000)
          itinerary.days.push({
            day: dayIndex + 1,
            date: dayDate.toISOString().split("T")[0],
            activities: [
              {
                time: "09:00 AM",
                activity: `Day ${dayIndex + 1} exploration`,
                location: dayIndex === duration - 1 ? destination : "En route destinations",
                description: "Continue your journey with local sightseeing and cultural experiences.",
              },
              {
                time: "02:00 PM",
                activity: "Lunch and local exploration",
                location: "Local restaurant and attractions",
                description: "Enjoy regional cuisine and explore nearby points of interest.",
              },
              {
                time: "07:00 PM",
                activity: "Evening relaxation",
                location: "Hotel/accommodation area",
                description: "Check into accommodation and enjoy dinner at a local restaurant.",
              },
            ],
          })
        }

        // Ensure required string fields exist
        itinerary.summary = itinerary.summary || `A ${duration}-day road trip from ${startLocation} to ${destination}`
        itinerary.total_distance =
          itinerary.total_distance || `${Math.floor(duration * 200 + Math.random() * 300)} km approximately`
        itinerary.estimated_cost =
          itinerary.estimated_cost ||
          `₹${budgetLevel === "low" ? "15,000-25,000" : budgetLevel === "medium" ? "25,000-50,000" : "50,000-100,000"} per person`

        console.log("Itinerary structure validated and cleaned successfully")
      } catch (parseError) {
        console.error("JSON parsing failed:", parseError.message)
        console.log("Raw Cohere response:", text.substring(0, 1000) + "...")

        // Enhanced fallback itinerary with more realistic content
        console.log("Using fallback itinerary...")
        itinerary = {
          summary: `An exciting ${duration}-day road trip adventure from ${startLocation} to ${destination}, featuring India's diverse landscapes, rich cultural heritage, and authentic local experiences tailored to your interests: ${interests.join(", ")}.`,
          total_distance: `${Math.floor(duration * 200 + Math.random() * 300)} km approximately`,
          estimated_cost: `₹${budgetLevel === "low" ? "15,000-25,000" : budgetLevel === "medium" ? "25,000-50,000" : "50,000-100,000"} per person`,
          days: Array.from({ length: duration }, (_, i) => {
            const dayDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
            const isFirstDay = i === 0
            const isLastDay = i === duration - 1

            return {
              day: i + 1,
              date: dayDate.toISOString().split("T")[0],
              activities: [
                {
                  time: "09:00 AM",
                  activity: isFirstDay
                    ? `Departure from ${startLocation}`
                    : isLastDay
                      ? `Arrival and exploration in ${destination}`
                      : `Day ${i + 1} - Journey and sightseeing`,
                  location: isFirstDay ? startLocation : isLastDay ? destination : "En route destinations",
                  description: isFirstDay
                    ? `Begin your exciting road trip from ${startLocation}. Check your vehicle, pack essentials, and start your journey towards ${destination}.`
                    : isLastDay
                      ? `Reach your final destination ${destination}. Explore the main attractions and enjoy local cuisine based on your interests: ${interests.join(", ")}.`
                      : `Continue your journey with stops at scenic locations, local markets, and cultural sites. Experience authentic Indian hospitality and regional specialties.`,
                },
                {
                  time: "02:00 PM",
                  activity: "Lunch and local exploration",
                  location: "Local restaurant and nearby attractions",
                  description:
                    "Enjoy regional cuisine at a recommended local restaurant and explore nearby points of interest, markets, or cultural sites.",
                },
                {
                  time: "07:00 PM",
                  activity: "Evening relaxation and dinner",
                  location: "Hotel/accommodation area",
                  description:
                    "Check into your accommodation, freshen up, and enjoy dinner at a local restaurant. Plan for the next day's journey.",
                },
              ],
            }
          }),
        }
      }

      // Generate route coordinates (simplified for demo)
      const routeCoordinates = await generateRouteCoordinates(startLocation, destination)

      // Save trip to database
      const tripTitle = `${startLocation} to ${destination}`
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
      )

      const tripId = insertResult.rows[0].id

      console.log(`Itinerary generated and saved with ID: ${tripId}`)

      res.status(201).json({
        message: "Itinerary generated successfully",
        tripId,
        itinerary,
      })
    } catch (error) {
      console.error("Itinerary generation error:", error)

      // Handle specific Cohere errors
      if (error.message.includes("Rate limit exceeded")) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          message: "Please wait a few minutes before generating another itinerary.",
        })
      }

      if (error.message.includes("API key")) {
        return res.status(500).json({
          error: "AI service configuration error",
          message: "Please contact support if this issue persists.",
        })
      }

      if (error.message.includes("quota exceeded")) {
        return res.status(503).json({
          error: "Service temporarily unavailable",
          message: "AI service quota exceeded. Please try again later.",
        })
      }

      res.status(500).json({
        error: "Failed to generate itinerary",
        message: "Please try again or contact support if the problem persists",
      })
    }
  },
)

// Helper function to generate route coordinates
async function generateRouteCoordinates(startLocation, destination) {
  // Enhanced location coordinates for better coverage of India
  const locationCoordinates = {
    // Major Cities
    mumbai: [19.076, 72.8777],
    delhi: [28.6139, 77.209],
    bangalore: [12.9716, 77.5946],
    bengaluru: [12.9716, 77.5946],
    chennai: [13.0827, 80.2707],
    kolkata: [22.5726, 88.3639],
    hyderabad: [17.385, 78.4867],
    pune: [18.5204, 73.8567],
    ahmedabad: [23.0225, 72.5714],
    jaipur: [26.9124, 75.7873],
    surat: [21.1702, 72.8311],
    kanpur: [26.4499, 80.3319],
    lucknow: [26.8467, 80.9462],
    nagpur: [21.1458, 79.0882],
    indore: [22.7196, 75.8577],
    thane: [19.2183, 72.9781],
    bhopal: [23.2599, 77.4126],
    visakhapatnam: [17.6868, 83.2185],
    pimpri: [18.6298, 73.7997],
    patna: [25.5941, 85.1376],
    vadodara: [22.3072, 73.1812],
    ghaziabad: [28.6692, 77.4538],
    ludhiana: [30.901, 75.8573],
    agra: [27.1767, 78.0081],
    nashik: [19.9975, 73.7898],
    faridabad: [28.4089, 77.3178],
    meerut: [28.9845, 77.7064],
    rajkot: [22.3039, 70.8022],
    kalyan: [19.2437, 73.1355],
    vasai: [19.4911, 72.8054],
    varanasi: [25.3176, 82.9739],
    srinagar: [34.0837, 74.7973],
    aurangabad: [19.8762, 75.3433],
    dhanbad: [23.7957, 86.4304],
    amritsar: [31.634, 74.8723],
    navi: [19.033, 73.0297],
    allahabad: [25.4358, 81.8463],
    prayagraj: [25.4358, 81.8463],
    ranchi: [23.3441, 85.3096],
    howrah: [22.5958, 88.2636],
    coimbatore: [11.0168, 76.9558],
    jabalpur: [23.1815, 79.9864],
    gwalior: [26.2183, 78.1828],
    vijayawada: [16.5062, 80.648],
    jodhpur: [26.2389, 73.0243],
    madurai: [9.9252, 78.1198],
    raipur: [21.2514, 81.6296],
    kota: [25.2138, 75.8648],
    chandigarh: [30.7333, 76.7794],
    guwahati: [26.1445, 91.7362],

    // States and Regions
    goa: [15.2993, 74.124],
    kerala: [10.8505, 76.2711],
    rajasthan: [27.0238, 74.2179],
    "himachal pradesh": [31.1048, 77.1734],
    uttarakhand: [30.0668, 79.0193],
    "uttar pradesh": [26.8467, 80.9462],
    bihar: [25.0961, 85.3131],
    "west bengal": [22.9868, 87.855],
    odisha: [20.9517, 85.0985],
    "madhya pradesh": [22.9734, 78.6569],
    gujarat: [23.0225, 72.5714],
    maharashtra: [19.7515, 75.7139],
    karnataka: [15.3173, 75.7139],
    "tamil nadu": [11.1271, 78.6569],
    "andhra pradesh": [15.9129, 79.74],
    telangana: [18.1124, 79.0193],
    punjab: [31.1471, 75.3412],
    haryana: [29.0588, 76.0856],
    "jammu and kashmir": [34.0837, 74.7973],
    assam: [26.2006, 92.9376],
    manipur: [24.6637, 93.9063],
    meghalaya: [25.467, 91.3662],
    tripura: [23.9408, 91.9882],
    mizoram: [23.1645, 92.9376],
    nagaland: [26.1584, 94.5624],
    arunachal: [28.218, 94.7278],

    // Popular Tourist Destinations
    manali: [32.2396, 77.1887],
    shimla: [31.1048, 77.1734],
    dharamshala: [32.219, 76.3234],
    rishikesh: [30.0869, 78.2676],
    haridwar: [29.9457, 78.1642],
    mussoorie: [30.4598, 78.0664],
    nainital: [29.3803, 79.4636],
    darjeeling: [27.041, 88.2663],
    gangtok: [27.3389, 88.6065],
    ooty: [11.4064, 76.6932],
    kodaikanal: [10.2381, 77.4892],
    munnar: [10.0889, 77.0595],
    alleppey: [9.4981, 76.3388],
    kochi: [9.9312, 76.2673],
    hampi: [15.335, 76.46],
    mysore: [12.2958, 76.6394],
    udaipur: [24.5854, 73.7125],
    pushkar: [26.4899, 74.5511],
    mount: [24.5925, 73.6827],
    jaisalmer: [26.9157, 70.9083],
    bikaner: [28.0229, 73.3119],
    ajmer: [26.4499, 74.6399],
    ranthambore: [26.0173, 76.5026],
    khajuraho: [24.8318, 79.9199],
    orchha: [25.3518, 78.6418],
    sanchi: [23.4793, 77.7398],
    bodh: [24.6959, 84.9914],
    vaishali: [25.7359, 85.1303],
    rajgir: [25.0285, 85.4219],
    nalanda: [25.1372, 85.4428],
  }

  const startKey = startLocation
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
  const destKey = destination
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()

  // Try to find exact matches first
  let startCoords = locationCoordinates[startKey]
  let destCoords = locationCoordinates[destKey]

  // If no exact match, try partial matches
  if (!startCoords) {
    const startMatch = Object.keys(locationCoordinates).find((key) => key.includes(startKey) || startKey.includes(key))
    if (startMatch) startCoords = locationCoordinates[startMatch]
  }

  if (!destCoords) {
    const destMatch = Object.keys(locationCoordinates).find((key) => key.includes(destKey) || destKey.includes(key))
    if (destMatch) destCoords = locationCoordinates[destMatch]
  }

  // Default to center of India if no match found
  startCoords = startCoords || [20.5937, 78.9629]
  destCoords = destCoords || [20.5937, 78.9629]

  // Generate intermediate points for a more realistic route
  const route = [startCoords]

  const latDiff = destCoords[0] - startCoords[0]
  const lngDiff = destCoords[1] - startCoords[1]

  // Add 3-5 intermediate points based on distance
  const numPoints = Math.min(5, Math.max(3, Math.floor(Math.abs(latDiff) + Math.abs(lngDiff)) * 2))

  for (let i = 1; i < numPoints; i++) {
    const factor = i / numPoints
    // Add some randomness to make the route more realistic
    const randomLat = (Math.random() - 0.5) * 0.5
    const randomLng = (Math.random() - 0.5) * 0.5

    route.push([startCoords[0] + latDiff * factor + randomLat, startCoords[1] + lngDiff * factor + randomLng])
  }

  route.push(destCoords)

  return route
}

// Health check endpoint for Cohere
router.get("/health", async (req, res) => {
  try {
    const { checkCohereStatus } = require("../config/cohere")
    const status = await checkCohereStatus()

    res.json({
      service: "Itinerary Generation",
      cohere_status: status.status,
      message: status.message,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      service: "Itinerary Generation",
      cohere_status: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
    })
  }
})

module.exports = router
