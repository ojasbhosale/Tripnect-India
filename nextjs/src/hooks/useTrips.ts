'use client'

import { useState, useEffect } from 'react'
import { TripFeedResponse, TripFilters } from '@/types'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export function useTrips(filters: TripFilters = {}, page: number = 1) {
  const [data, setData] = useState<TripFeedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrips = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('per_page', '12')
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })

      const response = await api.get(`/api/v1/trips/feed?${params}`)
      setData(response.data)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch trips'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrips()
  }, [JSON.stringify(filters), page])

  return {
    data,
    loading,
    error,
    refetch: fetchTrips
  }
}