"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Plus, Calendar, Users, Trash2, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/services/auth"
import { tripService } from "@/services/trips"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import Navbar from "@/components/navbar"

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-50 to-blue-100 border-b">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Plan Your Next Adventure with <span className="text-indigo-600">AI</span>
          </h1>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Create smart itineraries, organize your trips, and keep all your journeys in one place.
          </p>
          <Link href="/ai-planner/plan">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 px-8 py-4 text-lg">
              <Plus className="h-5 w-5 mr-2" />
              Start a New Trip
            </Button>
          </Link>
        </div>
      </section>

      {/* Recent Trips */}
      <main className="container mx-auto px-4 py-10 flex-1 w-full">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Trips</h2>
          <p className="text-gray-600">Revisit and manage your past adventures</p>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
            <p className="text-gray-600 mb-6">Start planning your first journey today!</p>
            <Link href="/ai-planner/plan">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Plan Your First Trip
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{trip.title}</CardTitle>
                  <CardDescription>
                    {trip.start_location} → {trip.destination}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <div className="space-y-2 text-sm text-gray-600 flex-1">
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
