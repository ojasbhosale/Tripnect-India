// backend/routes/auth.js

const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { body, validationResult } = require("express-validator")
const pool = require("../config/database")

const router = express.Router()

// Register endpoint
router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
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

      const { name, email, password } = req.body

      // Check if user already exists
      const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "User already exists with this email" })
      }

      // Hash password
      const saltRounds = 12
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      // Create user
      const result = await pool.query(
        "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
        [name, email, hashedPassword],
      )

      const newUser = result.rows[0]

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          created_at: newUser.created_at,
        },
      })
    } catch (error) {
      console.error("Registration error:", error)
      res.status(500).json({ error: "Internal server error during registration" })
    }
  },
)

// Login endpoint
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
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

      const { email, password } = req.body

      // Find user
      const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email])
      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" })
      }

      const user = userResult.rows[0]

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" })
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      )

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
    } catch (error) {
      console.error("Login error:", error)
      res.status(500).json({ error: "Internal server error during login" })
    }
  },
)

// Verify token endpoint
router.get("/verify", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({ error: "No token provided" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const userResult = await pool.query("SELECT id, name, email FROM users WHERE id = $1", [decoded.userId])

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "User not found" })
    }

    res.json({ user: userResult.rows[0] })
  } catch (error) {
    console.error("Token verification error:", error)
    res.status(401).json({ error: "Invalid token" })
  }
})

module.exports = router
