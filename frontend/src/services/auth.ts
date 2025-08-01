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

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("auth-token")
      window.location.href = "/auth"
    }
    return Promise.reject(error)
  },
)

export const authService = {
  async register(name: string, email: string, password: string) {
    const response = await api.post("/auth/register", { name, email, password })
    return response.data
  },

  async login(email: string, password: string) {
    const response = await api.post("/auth/login", { email, password })
    if (response.data.token) {
      Cookies.set("auth-token", response.data.token, { expires: 7 })
    }
    return response.data
  },

  async logout() {
    Cookies.remove("auth-token")
  },

  async getCurrentUser() {
    const response = await api.get("/auth/verify")
    return response.data.user
  },

  isAuthenticated() {
    return !!Cookies.get("auth-token")
  },
}
