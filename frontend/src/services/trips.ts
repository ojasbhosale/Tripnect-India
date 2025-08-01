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

export const tripService = {
  async getTrips() {
    const response = await api.get("/trips")
    return response.data
  },

  async getTrip(tripId: string) {
    const response = await api.get(`/trips/${tripId}`)
    return response.data
  },

  async deleteTrip(tripId: number) {
    const response = await api.delete(`/trips/${tripId}`)
    return response.data
  },

  async updateTrip(tripId: number, updates: any) {
    const response = await api.put(`/trips/${tripId}`, updates)
    return response.data
  },
}
