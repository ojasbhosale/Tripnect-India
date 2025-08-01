import axios from "axios"
import Cookies from "js-cookie"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get("auth-token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const itineraryService = {
  async generateItinerary(tripData: {
    startLocation: string
    destination: string
    startDate: string
    endDate: string
    travelers: number
    budgetLevel: string
    interests: string[]
    additionalRequests: string
  }) {
    const response = await api.post("/itinerary/generate", tripData)
    return response.data
  },
}
