const express = require("express")
const { checkCohereStatus } = require("../config/cohere")
const pool = require("../config/database")

const router = express.Router()

// Comprehensive health check endpoint
router.get("/", async (req, res) => {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    status: "OK",
    services: {},
  }

  try {
    // Check database connection
    try {
      await pool.query("SELECT 1")
      healthCheck.services.database = { status: "OK", message: "Connected" }
    } catch (dbError) {
      healthCheck.services.database = { status: "ERROR", message: dbError.message }
      healthCheck.status = "DEGRADED"
    }

    // Check Cohere API
    try {
      const cohereStatus = await checkCohereStatus()
      healthCheck.services.cohere = cohereStatus
      if (cohereStatus.status !== "ok") {
        healthCheck.status = "DEGRADED"
      }
    } catch (cohereError) {
      healthCheck.services.cohere = { status: "ERROR", message: cohereError.message }
      healthCheck.status = "DEGRADED"
    }

    // Check environment variables
    const requiredEnvVars = ["COHERE_API_KEY", "DATABASE_URL", "JWT_SECRET"]
    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

    if (missingEnvVars.length > 0) {
      healthCheck.services.environment = {
        status: "ERROR",
        message: `Missing environment variables: ${missingEnvVars.join(", ")}`,
      }
      healthCheck.status = "ERROR"
    } else {
      healthCheck.services.environment = { status: "OK", message: "All required variables set" }
    }

    const statusCode = healthCheck.status === "OK" ? 200 : healthCheck.status === "DEGRADED" ? 200 : 503
    res.status(statusCode).json(healthCheck)
  } catch (error) {
    res.status(503).json({
      timestamp: new Date().toISOString(),
      status: "ERROR",
      message: error.message,
    })
  }
})

module.exports = router
