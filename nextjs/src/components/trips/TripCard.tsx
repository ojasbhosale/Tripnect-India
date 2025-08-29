'use client'

import { TripSummary } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { MapPin, Calendar, Users, IndianRupee, User } from 'lucide-react'
import { formatDateRange, formatCurrency, calculateDuration } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Link from 'next/link'

interface TripCardProps {
  trip: TripSummary
  onRequestJoin?: (tripId: number) => void
  showJoinButton?: boolean
}

export default function TripCard({ trip, onRequestJoin, showJoinButton = true }: TripCardProps) {
  const duration = calculateDuration(trip.start_date, trip.end_date)
  const availableSlots = trip.open_slots - trip.current_participants
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {trip.title}
            </h3>
            <div className="flex items-center text-gray-600 mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{trip.destination}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              {availableSlots > 0 ? (
                <span className="text-green-600 font-medium">{availableSlots} slots left</span>
              ) : (
                <span className="text-red-600 font-medium">Full</span>
              )}
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {formatDateRange(trip.start_date, trip.end_date)} • {duration} days
            </span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <Users className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {trip.current_participants}/{trip.open_slots} travelers
            </span>
          </div>

          {(trip.budget_min || trip.budget_max) && (
            <div className="flex items-center text-gray-600">
              <IndianRupee className="h-4 w-4 mr-2" />
              <span className="text-sm">
                {trip.budget_min && trip.budget_max
                  ? `${formatCurrency(trip.budget_min)} - ${formatCurrency(trip.budget_max)}`
                  : trip.budget_min
                  ? `${formatCurrency(trip.budget_min)}+`
                  : `Up to ${formatCurrency(trip.budget_max!)}`
                }
              </span>
            </div>
          )}
        </div>

        {/* Host Info */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{trip.host.name}</p>
              <p className="text-xs text-gray-500">Trip Host</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link href={`/trips/${trip.id}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
            {showJoinButton && availableSlots > 0 && onRequestJoin && (
              <Button 
                size="sm" 
                onClick={() => onRequestJoin(trip.id)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Request to Join
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}