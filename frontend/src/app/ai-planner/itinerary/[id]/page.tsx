

"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Users, Clock, Download, ArrowLeft, FileText } from "lucide-react"
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
  const [isExporting, setIsExporting] = useState(false)
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
      router.push("/ai-planner")
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // PDF Export using html2pdf.js
  const exportToPDF = async () => {
    if (!trip) return
    
    setIsExporting(true)
    
    try {
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default
      
      // Create a clean HTML version for PDF
      const element = document.createElement('div')
      element.style.padding = '30px'
      element.style.fontFamily = 'Arial, sans-serif'
      element.style.backgroundColor = 'white'
      element.style.color = 'black'
      element.style.lineHeight = '1.6'
      
      element.innerHTML = `
        <div style="margin-bottom: 40px; border-bottom: 3px solid #4f46e5; padding-bottom: 20px;">
          <h1 style="color: #4f46e5; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">${trip.title}</h1>
          <p style="color: #666; margin: 0; font-size: 18px; font-weight: 500;">${trip.start_location} → ${trip.destination}</p>
        </div>
        
        <div style="margin-bottom: 40px;">
          <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px; font-weight: bold;">Trip Overview</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
              <strong style="color: #4f46e5;">Dates:</strong><br>
              ${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
              <strong style="color: #4f46e5;">Travelers:</strong> ${trip.travelers}<br>
              <strong style="color: #4f46e5;">Budget:</strong> ${trip.budget_level}
            </div>
          </div>
          
          ${trip.interests && trip.interests.length > 0 ? 
            `<div style="margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px;">
              <strong style="color: #4f46e5;">Interests:</strong> ${trip.interests.join(', ')}
            </div>` : ''}
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #4f46e5;">Summary</h3>
            <p style="margin: 0; line-height: 1.8;">${trip.itinerary.summary}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
              <strong style="color: #047857;">Total Distance:</strong><br>
              <span style="font-size: 18px; font-weight: 600;">${trip.itinerary.total_distance}</span>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <strong style="color: #92400e;">Estimated Cost:</strong><br>
              <span style="font-size: 18px; font-weight: 600;">${trip.itinerary.estimated_cost}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h2 style="color: #333; margin: 0 0 25px 0; font-size: 22px; font-weight: bold;">Daily Itinerary</h2>
          ${trip.itinerary.days.map(day => `
            <div style="margin-bottom: 35px; page-break-inside: avoid;">
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 15px; margin: 0 0 20px 0; border-radius: 10px;">
                <h3 style="margin: 0; font-size: 20px; font-weight: bold;">
                  Day ${day.day} - ${formatDate(day.date)}
                </h3>
              </div>
              
              ${day.activities.map((activity, index) => `
                <div style="margin-bottom: 20px; padding: 20px; background: white; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="background: #4f46e5; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px; margin-right: 15px;">
                      ${activity.time}
                    </span>
                    <span style="font-weight: bold; font-size: 16px; color: #333;">
                      ${activity.activity}
                    </span>
                  </div>
                  
                  <div style="color: #666; margin-bottom: 10px; font-size: 14px;">
                    📍 ${activity.location}
                  </div>
                  
                  <p style="margin: 0; line-height: 1.6; color: #555;">
                    ${activity.description}
                  </p>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666;">
          <p style="margin: 0; font-size: 14px;">Generated by TripNect India - Your AI Travel Companion</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">Exported on ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
      `
      
      const options = {
        margin: 0.5,
        filename: `${trip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'in', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        }
      }
      
      await html2pdf().set(options).from(element).save()
      
      toast({
        title: "Success!",
        description: "Your itinerary has been exported to PDF",
      })
      
    } catch (error) {
      console.error('PDF export error:', error)
      toast({
        title: "Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Alternative: Export as formatted text file
  const exportToText = () => {
    if (!trip) return
    
    const textContent = `
${trip.title}
${'='.repeat(trip.title.length)}

Route: ${trip.start_location} → ${trip.destination}
Dates: ${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}
Travelers: ${trip.travelers}
Budget Level: ${trip.budget_level}

${trip.interests && trip.interests.length > 0 ? `Interests: ${trip.interests.join(', ')}\n` : ''}

TRIP OVERVIEW
${'-'.repeat(13)}
${trip.itinerary.summary}

Total Distance: ${trip.itinerary.total_distance}
Estimated Cost: ${trip.itinerary.estimated_cost}

DAILY ITINERARY
${'-'.repeat(15)}

${trip.itinerary.days.map(day => `
DAY ${day.day} - ${formatDate(day.date)}
${'-'.repeat(40)}

${day.activities.map(activity => `
${activity.time} - ${activity.activity}
Location: ${activity.location}
${activity.description}

`).join('')}
`).join('')}

Generated by TripNect India
Exported on: ${new Date().toLocaleDateString('en-IN')}
    `.trim()
    
    const blob = new Blob([textContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${trip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary.txt`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast({
      title: "Success!",
      description: "Your itinerary has been exported as text file",
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
          <Button onClick={() => router.push("/ai-planner")}>Back to Dashboard</Button>
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
              <Button variant="ghost" onClick={() => router.push("/ai-planner")}>
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
            
            {/* Export buttons */}
            <div className="flex space-x-2">
              <Button onClick={exportToText} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export Text
              </Button>
              <Button 
                onClick={exportToPDF} 
                variant="outline"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </>
                )}
              </Button>
            </div>
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