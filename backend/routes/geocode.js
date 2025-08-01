const express = require("express")
const { query, validationResult } = require("express-validator")

const router = express.Router()

// Geocoding endpoint using OpenCageData API
router.get(
  "/",
  [query("location").trim().isLength({ min: 1 }).withMessage("Location parameter is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const { location } = req.query
      const apiKey = process.env.OPENCAGE_API_KEY

      if (!apiKey) {
        return res.status(500).json({ error: "Geocoding service not configured" })
      }

      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&key=${apiKey}&countrycode=in&limit=5`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Geocoding API returned ${response.status}`)
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const results = data.results.map((result) => ({
          coordinates: [result.geometry.lat, result.geometry.lng],
          formatted_address: result.formatted,
          components: result.components,
          confidence: result.confidence,
        }))

        res.json({
          results,
          total_results: data.total_results,
          status: data.status,
        })
      } else {
        res.status(404).json({
          error: "Location not found",
          message: "No results found for the specified location in India",
        })
      }
    } catch (error) {
      console.error("Geocoding error:", error)
      res.status(500).json({
        error: "Geocoding service unavailable",
        message: "Please try again later",
      })
    }
  },
)

// Reverse geocoding endpoint
router.get(
  "/reverse",
  [
    query("lat").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude is required"),
    query("lng").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude is required"),
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

      const { lat, lng } = req.query
      const apiKey = process.env.OPENCAGE_API_KEY

      if (!apiKey) {
        return res.status(500).json({ error: "Geocoding service not configured" })
      }

      const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}&limit=1`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Reverse geocoding API returned ${response.status}`)
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        res.json({
          formatted_address: result.formatted,
          components: result.components,
          confidence: result.confidence,
        })
      } else {
        res.status(404).json({
          error: "Location not found",
          message: "No address found for the specified coordinates",
        })
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error)
      res.status(500).json({
        error: "Reverse geocoding service unavailable",
        message: "Please try again later",
      })
    }
  },
)

module.exports = router
