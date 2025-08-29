'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { TripRequest } from '@/types'
import RequestCard from '@/components/requests/RequestCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Inbox, Send } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function RequestsPage() {
  const [sentRequests, setSentRequests] = useState<TripRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<TripRequest[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchRequests()
    }
  }, [user])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      
      // Fetch sent requests
      const sentResponse = await api.get('/api/v1/requests/user/my-requests')
      setSentRequests(sentResponse.data)
      
      // Fetch received requests (for trips user hosts)
      // This would need to be implemented in the backend
      // For now, we'll leave it empty
      setReceivedRequests([])
      
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await api.put(`/api/v1/requests/${requestId}`, { status: 'accepted' })
      toast.success('Request accepted successfully!')
      fetchRequests()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to accept request')
    }
  }

  const handleRejectRequest = async (requestId: number) => {
    try {
      await api.put(`/api/v1/requests/${requestId}`, { status: 'rejected' })
      toast.success('Request rejected')
      fetchRequests()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to reject request')
    }
  }

  const handleCancelRequest = async (requestId: number) => {
    try {
      await api.delete(`/api/v1/requests/${requestId}`)
      toast.success('Request cancelled')
      fetchRequests()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to cancel request')
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h1>
        <p className="text-gray-600">You need to be logged in to view your requests.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trip Requests</h1>
        <p className="text-gray-600">
          Manage your trip requests and applications
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sent Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Sent Requests ({sentRequests.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sentRequests.length === 0 ? (
              <div className="text-center py-8">
                <Send className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No requests sent yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Browse trips and send join requests to start connecting with travelers
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onCancel={handleCancelRequest}
                    isHost={false}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Received Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Inbox className="h-5 w-5" />
              <span>Received Requests ({receivedRequests.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivedRequests.length === 0 ? (
              <div className="text-center py-8">
                <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No requests received yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Create trips to start receiving join requests from other travelers
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                    isHost={true}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}