"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, Calendar, Users, DollarSign, Heart, Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/services/auth"
import { itineraryService } from "@/services/itinerary"

const interests = [
  "Nature & Wildlife",
  "Historical Sites",
  "Food & Cuisine",
  "Adventure Sports",
  "Beaches",
  "Mountains",
  "Cultural Heritage",
  "Photography",
  "Spiritual Places",
  "Shopping",
]

export default function PlanTrip() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
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
    } catch (error) {
      router.push("/auth")
    }
  }

  const handleInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      setSelectedInterests([...selectedInterests, interest])
    } else {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const tripData = {
      startLocation: formData.get("startLocation") as string,
      destination: formData.get("destination") as string,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      travelers: Number.parseInt(formData.get("travelers") as string),
      budgetLevel: formData.get("budgetLevel") as string,
      interests: selectedInterests,
      additionalRequests: formData.get("additionalRequests") as string,
    }

    try {
      const result = await itineraryService.generateItinerary(tripData)
      toast({ title: "Success!", description: "Your itinerary has been generated." })
      router.push(`/itinerary/${result.tripId}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate itinerary. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  }

  const getNextWeekDate = () => {
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek.toISOString().split("T")[0]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push("/ai-planner")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2">
                <MapPin className="h-8 w-8 text-indigo-600" />
                <h1 className="text-2xl font-bold text-gray-900">TripNect India</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Road Trip</h2>
            <p className="text-gray-600">Tell us about your dream trip and let AI create the perfect itinerary</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
              <CardDescription>
                Fill in the details below to generate your personalized road trip itinerary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Location Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startLocation">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Starting Location
                    </Label>
                    <Input id="startLocation" name="startLocation" placeholder="e.g., Mumbai, Maharashtra" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Destination
                    </Label>
                    <Input id="destination" name="destination" placeholder="e.g., Goa" required />
                  </div>
                </div>

                {/* Date and Travelers */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Start Date
                    </Label>
                    <Input id="startDate" name="startDate" type="date" min={getTomorrowDate()} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      End Date
                    </Label>
                    <Input id="endDate" name="endDate" type="date" min={getNextWeekDate()} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travelers">
                      <Users className="h-4 w-4 inline mr-1" />
                      Travelers
                    </Label>
                    <Input id="travelers" name="travelers" type="number" min="1" max="20" defaultValue="2" required />
                  </div>
                </div>

                {/* Budget Level */}
                <div className="space-y-2">
                  <Label htmlFor="budgetLevel">
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Budget Level
                  </Label>
                  <Select name="budgetLevel" defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Budget-Friendly (₹1,000-3,000/day)</SelectItem>
                      <SelectItem value="medium">Moderate (₹3,000-7,000/day)</SelectItem>
                      <SelectItem value="high">Luxury (₹7,000+/day)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Interests */}
                <div className="space-y-3">
                  <Label>
                    <Heart className="h-4 w-4 inline mr-1" />
                    Interests (Optional)
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {interests.map((interest) => (
                      <div key={interest} className="flex items-center space-x-2">
                        <Checkbox
                          id={interest}
                          checked={selectedInterests.includes(interest)}
                          onCheckedChange={(checked) => handleInterestChange(interest, checked as boolean)}
                        />
                        <Label htmlFor={interest} className="text-sm">
                          {interest}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Requests */}
                <div className="space-y-2">
                  <Label htmlFor="additionalRequests">Additional Requests (Optional)</Label>
                  <Textarea
                    id="additionalRequests"
                    name="additionalRequests"
                    placeholder="Any specific places you want to visit, dietary restrictions, accessibility needs, etc."
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Your Itinerary...
                    </>
                  ) : (
                    "Generate My Trip Plan"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
