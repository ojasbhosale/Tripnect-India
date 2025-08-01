"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Users, Clock, Download, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/services/auth"
import { tripService } from "@/services/trips"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import dynamic from "next/dynamic"

// Dynamically import the map component to avoid SSR issues
const TripMap = dynamic(() => import("@/components/trip-map"), { ssr: false })

interface ItineraryDay {
  day: number
  date: string
  activities: {
    time: string
    activity: string
    location: string
    description: string
    coordinates?: [number, number]
  }[]
}

interface Trip {
  id: number
  title: string
  start_location: string
  destination: string
  start_date: string
  end_date: string
  travelers: number
  interests: string[]
  budget_level: string
  itinerary: {
    days: ItineraryDay[]
    summary: string
    total_distance: string
    estimated_cost: string
  }
  route_coordinates: [number, number][]
}

export default function ItineraryPage() {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    checkAuthAndFetchTrip()
  }, [params.id])

  const checkAuthAndFetchTrip = async () => {
    try {
      await authService.getCurrentUser()
      if (params.id) {
        await fetchTrip(params.id as string)
      }
    } catch (error) {
      router.push("/auth")
    }
  }

  const fetchTrip = async (tripId: string) => {
    try {
      const data = await tripService.getTrip(tripId)
      setTrip(data.trip)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Trip not found",
        variant: "destructive",
      })
      router.push("/dashboard")
    } finally {
      setIsLoading(false)
    }
  }

  const exportToPDF = () => {
    // This would integrate with a PDF generation library
    toast({ title: "Coming Soon", description: "PDF export feature will be available soon!" })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
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

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip not found</h2>
          <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{trip.title}</h1>
                <p className="text-gray-600">
                  {trip.start_location} → {trip.destination}
                </p>
              </div>
            </div>
            <Button onClick={exportToPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Itinerary Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trip Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Trip Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {trip.travelers} traveler{trip.travelers > 1 ? "s" : ""}
                  </div>
                </div>

                {trip.interests && trip.interests.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Interests:</p>
                    <div className="flex flex-wrap gap-2">
                      {trip.interests.map((interest) => (
                        <Badge key={interest} variant="secondary">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-gray-700">{trip.itinerary.summary}</p>

                <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Distance</p>
                    <p className="text-lg font-semibold">{trip.itinerary.total_distance}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Estimated Cost</p>
                    <p className="text-lg font-semibold">{trip.itinerary.estimated_cost}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Itinerary */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Daily Itinerary</h2>
              {trip.itinerary.days.map((day) => (
                <Card key={day.day}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <span className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
                        {day.day}
                      </span>
                      Day {day.day}
                    </CardTitle>
                    <CardDescription>{formatDate(day.date)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {day.activities.map((activity, index) => (
                        <div key={index} className="flex space-x-4">
                          <div className="flex-shrink-0">
                            <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-full">
                              <Clock className="h-4 w-4 text-indigo-600" />
                            </div>
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-indigo-600">{activity.time}</span>
                              <span className="text-gray-400">•</span>
                              <span className="font-medium">{activity.activity}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <MapPin className="h-3 w-3 mr-1" />
                              {activity.location}
                            </div>
                            <p className="text-gray-700 text-sm">{activity.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Route Map</CardTitle>
                <CardDescription>Interactive map showing your trip route and key locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 rounded-lg overflow-hidden">
                  <TripMap
                    route={trip.route_coordinates}
                    activities={trip.itinerary.days.flatMap((day) =>
                      day.activities.filter((activity) => activity.coordinates),
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
