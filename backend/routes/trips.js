const express = require("express")
const { body, validationResult } = require("express-validator")
const pool = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Get all trips for authenticated user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, start_location, destination, start_date, end_date, travelers, interests, budget_level, created_at FROM trips WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id],
    )

    res.json({ trips: result.rows })
  } catch (error) {
    console.error("Fetch trips error:", error)
    res.status(500).json({ error: "Failed to fetch trips" })
  }
})

// Get specific trip by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const tripId = Number.parseInt(req.params.id)

    if (isNaN(tripId)) {
      return res.status(400).json({ error: "Invalid trip ID" })
    }

    const result = await pool.query("SELECT * FROM trips WHERE id = $1 AND user_id = $2", [tripId, req.user.id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Trip not found" })
    }

    res.json({ trip: result.rows[0] })
  } catch (error) {
    console.error("Fetch trip error:", error)
    res.status(500).json({ error: "Failed to fetch trip" })
  }
})

// Delete trip
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const tripId = Number.parseInt(req.params.id)

    if (isNaN(tripId)) {
      return res.status(400).json({ error: "Invalid trip ID" })
    }

    const result = await pool.query("DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id", [
      tripId,
      req.user.id,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Trip not found" })
    }

    res.json({ message: "Trip deleted successfully" })
  } catch (error) {
    console.error("Delete trip error:", error)
    res.status(500).json({ error: "Failed to delete trip" })
  }
})

// Update trip
router.put(
  "/:id",
  authenticateToken,
  [
    body("title").optional().trim().isLength({ min: 1 }).withMessage("Title cannot be empty"),
    body("start_location").optional().trim().isLength({ min: 1 }).withMessage("Start location cannot be empty"),
    body("destination").optional().trim().isLength({ min: 1 }).withMessage("Destination cannot be empty"),
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

      const tripId = Number.parseInt(req.params.id)
      const updates = req.body

      if (isNaN(tripId)) {
        return res.status(400).json({ error: "Invalid trip ID" })
      }

      // Build dynamic update query
      const updateFields = []
      const values = []
      let paramCount = 1

      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined) {
          updateFields.push(`${key} = $${paramCount}`)
          values.push(updates[key])
          paramCount++
        }
      })

      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No valid fields to update" })
      }

      values.push(tripId, req.user.id)

      const query = `
      UPDATE trips 
      SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
      RETURNING *
    `

      const result = await pool.query(query, values)

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Trip not found" })
      }

      res.json({
        message: "Trip updated successfully",
        trip: result.rows[0],
      })
    } catch (error) {
      console.error("Update trip error:", error)
      res.status(500).json({ error: "Failed to update trip" })
    }
  },
)

module.exports = router
