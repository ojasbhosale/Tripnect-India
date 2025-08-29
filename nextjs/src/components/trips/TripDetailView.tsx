'use client'

import { useState, useEffect } from 'react'
import { TripDetail, TripRequest } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { 
  MapPin, 
  Calendar, 
  Users, 
  IndianRupee, 
  User, 
  MessageCircle,
  Clock,
  Star
} from 'lucide-react'
import { formatDateRange, formatCurrency, calculateDuration } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface TripDetailViewProps {
  tripId: number
}

export default function TripDetailView({ tripId }: TripDetailViewProps) {
  const [trip, setTrip] = useState<TripDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    fetchTripDetails()
  }, [tripId])

  const fetchTripDetails = async () => {
    try {
      const response = await api.get(`/api/v1/trips/${tripId}`)
      setTrip(response.data)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch trip details')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestJoin = async () => {
    if (!user) {
      toast.error('Please login to request joining this trip')
      return
    }

    try {
      setRequestLoading(true)
      await api.post('/api/v1/requests/', {
        trip_id: tripId,
        message: requestMessage
      })
      toast.success('Join request sent successfully!')
      setRequestModalOpen(false)
      setRequestMessage('')
      fetchTripDetails() // Refresh trip details
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send request')
    } finally {
      setRequestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Trip Not Found</h1>
        <p className="text-gray-600 mb-6">The trip you're looking for doesn't exist or has been removed.</p>
        <Link href="/explore">
          <Button>Back to Explore</Button>
        </Link>
      </div>
    )
  }

  const duration = calculateDuration(trip.start_date, trip.end_date)
  const availableSlots = trip.open_slots - trip.current_participants
  const isHost = user?.id === trip.host_id
  const isParticipant = trip.participants.some(p => p.user_id === user?.id)
  const canJoin = user && !isHost && !isParticipant && availableSlots > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{trip.title}</h1>
        <div className="flex items-center text-gray-600">
          <MapPin className="h-5 w-5 mr-2" />
          <span className="text-lg">{trip.destination}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Info */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Dates</p>
                    <p className="font-medium">{formatDateRange(trip.start_date, trip.end_date)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-medium">{duration} days</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Travelers</p>
                    <p className="font-medium">{trip.current_participants}/{trip.open_slots} joined</p>
                  </div>
                </div>

                {(trip.budget_min || trip.budget_max) && (
                  <div className="flex items-center space-x-3">
                    <IndianRupee className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Budget</p>
                      <p className="font-medium">
                        {trip.budget_min && trip.budget_max
                          ? `${formatCurrency(trip.budget_min)} - ${formatCurrency(trip.budget_max)}`
                          : trip.budget_min
                          ? `${formatCurrency(trip.budget_min)}+`
                          : `Up to ${formatCurrency(trip.budget_max!)}`
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {trip.description && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 leading-relaxed">{trip.description}</p>
                </div>
              )}

              {Object.keys(trip.preferences).length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(trip.preferences).map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {key.replace('_', ' ')}: {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Members ({trip.participants.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trip.participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{participant.user.name}</p>
                        <p className="text-sm text-gray-500">
                          {participant.role === 'host' ? 'Trip Host' : 'Participant'}
                        </p>
                      </div>
                    </div>
                    {participant.role === 'host' && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-500">Host</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Host Info */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Host</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{trip.host.name}</p>
                  <p className="text-sm text-gray-500">{trip.host.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {availableSlots > 0 ? (
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600 mb-2">
                      {availableSlots} slot{availableSlots !== 1 ? 's' : ''} available
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-lg font-semibold text-red-600 mb-2">Trip is full</p>
                  </div>
                )}

                {canJoin && (
                  <Button
                    onClick={() => setRequestModalOpen(true)}
                    className="w-full"
                  >
                    Request to Join
                  </Button>
                )}

                {isParticipant && (
                  <Link href={`/trips/${trip.id}/chat`}>
                    <Button className="w-full flex items-center justify-center space-x-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>Group Chat</span>
                    </Button>
                  </Link>
                )}

                {isHost && (
                  <div className="space-y-2">
                    <Link href={`/trips/${trip.id}/manage`}>
                      <Button variant="outline" className="w-full">
                        Manage Trip
                      </Button>
                    </Link>
                    <Link href={`/trips/${trip.id}/chat`}>
                      <Button className="w-full flex items-center justify-center space-x-2">
                        <MessageCircle className="h-4 w-4" />
                        <span>Group Chat</span>
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Join Request Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Request to Join Trip"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Send a message to the trip host explaining why you'd like to join this trip.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message to Host (Optional)
            </label>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={4}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Hi! I'm interested in joining your trip because..."
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setRequestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestJoin}
              loading={requestLoading}
            >
              Send Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}