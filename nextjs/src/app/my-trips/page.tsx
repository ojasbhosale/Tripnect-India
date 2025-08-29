'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Trip } from '@/types'
import TripCard from '@/components/trips/TripCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Plus, MapPin } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function MyTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchUserTrips()
    }
  }, [user])

  const fetchUserTrips = async () => {
    try {
      const response = await api.get('/api/v1/trips/user/my-trips')
      setTrips(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch your trips')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h1>
        <p className="text-gray-600">You need to be logged in to view your trips.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const hostedTrips = trips.filter(trip => trip.host_id === user.id)
  const participatingTrips = trips.filter(trip => trip.host_id !== user.id)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Trips</h1>
          <p className="text-gray-600">
            Manage your hosted trips and view trips you're participating in
          </p>
        </div>
        <Link href="/create-trip">
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Trip</span>
          </Button>
        </Link>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No trips yet</h3>
            <p className="text-gray-600 mb-6">
              Start by creating your first trip or join existing ones from the explore page.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/create-trip">
                <Button>Create Your First Trip</Button>
              </Link>
              <Link href="/explore">
                <Button variant="outline">Explore Trips</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Hosted Trips */}
          {hostedTrips.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Hosted by You ({hostedTrips.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hostedTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    showJoinButton={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Participating Trips */}
          {participatingTrips.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Participating In ({participatingTrips.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {participatingTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    showJoinButton={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}