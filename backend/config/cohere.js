const { CohereClient } = require("cohere-ai")

// Initialize Cohere client
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
})

// Helper function to generate text with Cohere
async function generateTextWithCohere(prompt, options = {}) {
  try {
    const response = await cohere.generate({
      model: "command-light", // Free tier model
      prompt:
        prompt +
        "\n\nIMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.",
      max_tokens: options.maxTokens || 3000,
      temperature: options.temperature || 0.7,
      k: 0,
      stop_sequences: [],
      return_likelihoods: "NONE",
    })

    if (response.generations && response.generations.length > 0) {
      return response.generations[0].text.trim()
    } else {
      throw new Error("No response generated from Cohere")
    }
  } catch (error) {
    console.error("Cohere API Error:", error)

    // Handle rate limiting
    if (error.statusCode === 429) {
      throw new Error("Rate limit exceeded. Please try again in a few minutes.")
    }

    // Handle API key issues
    if (error.statusCode === 401) {
      throw new Error("Invalid Cohere API key. Please check your configuration.")
    }

    // Handle quota exceeded
    if (error.statusCode === 402) {
      throw new Error("Cohere API quota exceeded. Please upgrade your plan or try again later.")
    }

    throw new Error(`Cohere API error: ${error.message}`)
  }
}

// Helper function to check API status
async function checkCohereStatus() {
  try {
    const response = await cohere.generate({
      model: "command-light",
      prompt: "Test",
      max_tokens: 10,
    })
    return { status: "ok", message: "Cohere API is working" }
  } catch (error) {
    return {
      status: "error",
      message: error.message,
      statusCode: error.statusCode,
    }
  }
}

module.exports = {
  cohere,
  generateTextWithCohere,
  checkCohereStatus,
}
