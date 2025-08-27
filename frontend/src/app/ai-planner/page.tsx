"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Plus, Calendar, Users, Trash2, Eye, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/services/auth"
import { tripService } from "@/services/trips"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface Trip {
  id: number
  title: string
  start_location: string
  destination: string
  start_date: string
  end_date: string
  travelers: number
  created_at: string
}

export default function Dashboard() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const userData = await authService.getCurrentUser()
      setUser(userData)
      await fetchTrips()
    } catch (error) {
      router.push("/auth")
    }
  }

  const fetchTrips = async () => {
    try {
      const data = await tripService.getTrips()
      setTrips(data.trips)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load trips",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTrip = async (tripId: number) => {
    if (!confirm("Are you sure you want to delete this trip?")) return

    try {
      await tripService.deleteTrip(tripId)
      setTrips(trips.filter((trip) => trip.id !== tripId))
      toast({ title: "Success", description: "Trip deleted successfully" })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete trip",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MapPin className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">TripNect India</h1>
                {user && <p className="text-sm text-gray-600">Welcome back, {user.name}!</p>}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/ai-planner/plan">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Trip
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Road Trips</h2>
          <p className="text-gray-600">Manage and view all your planned adventures</p>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
            <p className="text-gray-600 mb-6">Start planning your first road trip adventure!</p>
            <Link href="/ai-planner/plan">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Plan Your First Trip
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{trip.title}</CardTitle>
                  <CardDescription>
                    {trip.start_location} → {trip.destination}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {trip.travelers} traveler{trip.travelers > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <Link href={`/ai-planner/itinerary/${trip.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTrip(trip.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
