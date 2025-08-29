'use client'

import { TripRequest } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { MapPin, Calendar, User, Clock } from 'lucide-react'
import { formatDateRange } from '@/lib/utils'
import { format } from 'date-fns'

interface RequestCardProps {
  request: TripRequest
  onAccept?: (requestId: number) => void
  onReject?: (requestId: number) => void
  onCancel?: (requestId: number) => void
  showActions?: boolean
  isHost?: boolean
}

export default function RequestCard({ 
  request, 
  onAccept, 
  onReject, 
  onCancel, 
  showActions = true,
  isHost = false 
}: RequestCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'accepted':
        return 'Accepted'
      case 'rejected':
        return 'Rejected'
      default:
        return status
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {request.trip.title}
            </h3>
            <div className="flex items-center text-gray-600 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{request.trip.destination}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-sm">
                {formatDateRange(request.trip.start_date, request.trip.end_date)}
              </span>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
            {getStatusText(request.status)}
          </span>
        </div>

        {/* Requester/User Info */}
        <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {isHost ? request.user.name : `Request from ${request.user.name}`}
            </p>
            <p className="text-sm text-gray-500">{request.user.email}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              <span className="text-xs">
                {format(new Date(request.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Message */}
        {request.message && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700 italic">"{request.message}"</p>
          </div>
        )}

        {/* Actions */}
        {showActions && request.status === 'pending' && (
          <div className="flex justify-end space-x-3">
            {isHost ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReject?.(request.id)}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAccept?.(request.id)}
                >
                  Accept
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel?.(request.id)}
              >
                Cancel Request
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}