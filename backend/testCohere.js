require("dotenv").config()
const { CohereClient } = require("cohere-ai")

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
})

async function test() {
  try {
    const response = await cohere.generate({
      model: "command-light",
      prompt: "Hello, what's up?",
      max_tokens: 20,
    })

    console.log("✅ Cohere responded:", response.generations[0].text)
  } catch (err) {
    console.error("❌ Error:", err.statusCode, err.message)
  }
}

test()
