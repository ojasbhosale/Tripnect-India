'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreateTripData } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const createTripSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  destination: z.string().min(1, 'Destination is required').max(255, 'Destination too long'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  description: z.string().optional(),
  open_slots: z.number().min(1, 'At least 1 slot required').max(50, 'Too many slots'),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
}).refine((data) => {
  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)
  return endDate > startDate
}, {
  message: "End date must be after start date",
  path: ["end_date"]
}).refine((data) => {
  const startDate = new Date(data.start_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return startDate >= today
}, {
  message: "Start date cannot be in the past",
  path: ["start_date"]
})

type CreateTripFormData = z.infer<typeof createTripSchema>

export default function CreateTripForm() {
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<Record<string, any>>({})
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<CreateTripFormData>({
    resolver: zodResolver(createTripSchema)
  })

  const budgetMin = watch('budget_min')
  const budgetMax = watch('budget_max')

  const onSubmit = async (data: CreateTripFormData) => {
    try {
      setLoading(true)
      
      const tripData: CreateTripData = {
        ...data,
        preferences,
        budget_min: data.budget_min || undefined,
        budget_max: data.budget_max || undefined,
      }

      const response = await api.post('/api/v1/trips/', tripData)
      toast.success('Trip created successfully!')
      router.push(`/trips/${response.data.id}`)
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to create trip'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create New Trip</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Trip Details</h3>
              
              <Input
                label="Trip Title"
                placeholder="Amazing Goa Beach Trip"
                {...register('title')}
                error={errors.title?.message}
              />

              <Input
                label="Destination"
                placeholder="Goa, India"
                {...register('destination')}
                error={errors.destination?.message}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Start Date"
                  {...register('start_date')}
                  error={errors.start_date?.message}
                />
                <Input
                  type="date"
                  label="End Date"
                  {...register('end_date')}
                  error={errors.end_date?.message}
                />
              </div>

              <Input
                type="number"
                label="Open Slots"
                placeholder="4"
                min="1"
                max="50"
                {...register('open_slots', { valueAsNumber: true })}
                error={errors.open_slots?.message}
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Tell potential travelers about your trip plans, what makes it special, and what to expect..."
                />
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Budget Range (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Minimum Budget (₹)"
                  placeholder="10000"
                  {...register('budget_min', { valueAsNumber: true })}
                  error={errors.budget_min?.message}
                />
                <Input
                  type="number"
                  label="Maximum Budget (₹)"
                  placeholder="25000"
                  {...register('budget_max', { valueAsNumber: true })}
                  error={errors.budget_max?.message}
                />
              </div>
              {budgetMin && budgetMax && budgetMin >= budgetMax && (
                <p className="text-sm text-red-600">Maximum budget should be higher than minimum budget</p>
              )}
            </div>

            {/* Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Trip Preferences (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Travel Style
                  </label>
                  <select
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onChange={(e) => handlePreferenceChange('travel_style', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="backpacking">Backpacking</option>
                    <option value="luxury">Luxury</option>
                    <option value="budget">Budget</option>
                    <option value="mid-range">Mid-range</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Type
                  </label>
                  <select
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onChange={(e) => handlePreferenceChange('group_type', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="mixed">Mixed</option>
                    <option value="female-only">Female Only</option>
                    <option value="male-only">Male Only</option>
                    <option value="couples">Couples</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age Group
                  </label>
                  <select
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onChange={(e) => handlePreferenceChange('age_group', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="18-25">18-25</option>
                    <option value="26-35">26-35</option>
                    <option value="36-45">36-45</option>
                    <option value="46+">46+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Activities
                  </label>
                  <select
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onChange={(e) => handlePreferenceChange('activities', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="adventure">Adventure</option>
                    <option value="cultural">Cultural</option>
                    <option value="relaxation">Relaxation</option>
                    <option value="nightlife">Nightlife</option>
                    <option value="photography">Photography</option>
                    <option value="trekking">Trekking</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
              >
                Create Trip
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}