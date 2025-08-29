'use client'

import { useState } from 'react'
import { TripFilters } from '@/types'
import { useTrips } from '@/hooks/useTrips'
import { useAuth } from '@/hooks/useAuth'
import TripCard from '@/components/trips/TripCard'
import TripFiltersComponent from '@/components/trips/TripFilters'
import Button from '@/components/ui/Button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function ExplorePage() {
  const [filters, setFilters] = useState<TripFilters>({})
  const [page, setPage] = useState(1)
  const { data, loading, refetch } = useTrips(filters, page)
  const { user } = useAuth()

  const handleRequestJoin = async (tripId: number) => {
    if (!user) {
      toast.error('Please login to request joining trips')
      return
    }

    try {
      await api.post('/api/v1/requests/', {
        trip_id: tripId,
        message: ''
      })
      toast.success('Join request sent successfully!')
      refetch()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send request')
    }
  }

  const handleFiltersChange = (newFilters: TripFilters) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }

  const totalPages = data ? Math.ceil(data.total / 12) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore Trips</h1>
        <p className="text-gray-600">
          Discover amazing group trips and connect with fellow travelers across India
        </p>
      </div>

      {/* Filters */}
      <TripFiltersComponent filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-xl h-64"></div>
            </div>
          ))}
        </div>
      ) : data?.trips.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No trips found</h3>
          <p className="text-gray-600 mb-6">
            Try adjusting your filters or check back later for new trips.
          </p>
          <Button onClick={() => handleFiltersChange({})}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          {/* Trip Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {data?.trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onRequestJoin={handleRequestJoin}
                showJoinButton={!!user}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>
              
              <div className="flex items-center space-x-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Results Info */}
          <div className="text-center mt-6 text-sm text-gray-500">
            Showing {((page - 1) * 12) + 1}-{Math.min(page * 12, data?.total || 0)} of {data?.total || 0} trips
          </div>
        </>
      )}
    </div>
  )
}