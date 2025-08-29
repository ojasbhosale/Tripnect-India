'use client'

import { useParams } from 'next/navigation'
import TripDetailView from '@/components/trips/TripDetailView'

export default function TripDetailPage() {
  const params = useParams()
  const tripId = parseInt(params.id as string)

  if (isNaN(tripId)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Trip</h1>
        <p className="text-gray-600">The trip ID provided is not valid.</p>
      </div>
    )
  }

  return <TripDetailView tripId={tripId} />
}