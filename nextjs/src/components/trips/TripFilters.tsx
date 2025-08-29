'use client'

import { useState } from 'react'
import { TripFilters } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Search, Filter, X } from 'lucide-react'

interface TripFiltersProps {
  filters: TripFilters
  onFiltersChange: (filters: TripFilters) => void
}

export default function TripFiltersComponent({ filters, onFiltersChange }: TripFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [localFilters, setLocalFilters] = useState<TripFilters>(filters)

  const handleFilterChange = (key: keyof TripFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    onFiltersChange(localFilters)
  }

  const clearFilters = () => {
    const emptyFilters: TripFilters = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== undefined && value !== null && value !== ''
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      {/* Basic Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Search destinations..."
            value={localFilters.destination || ''}
            onChange={(e) => handleFilterChange('destination', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>
          <Button onClick={applyFilters} className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <span>Search</span>
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="flex items-center space-x-2">
              <X className="h-4 w-4" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          <Input
            type="date"
            label="Start Date From"
            value={localFilters.start_date_from || ''}
            onChange={(e) => handleFilterChange('start_date_from', e.target.value)}
          />
          <Input
            type="date"
            label="Start Date To"
            value={localFilters.start_date_to || ''}
            onChange={(e) => handleFilterChange('start_date_to', e.target.value)}
          />
          <Input
            type="number"
            label="Min Budget (₹)"
            placeholder="5000"
            value={localFilters.budget_min || ''}
            onChange={(e) => handleFilterChange('budget_min', e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            type="number"
            label="Max Budget (₹)"
            placeholder="50000"
            value={localFilters.budget_max || ''}
            onChange={(e) => handleFilterChange('budget_max', e.target.value ? Number(e.target.value) : undefined)}
          />
          <div className="md:col-span-2 lg:col-span-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={localFilters.available_slots_only || false}
                onChange={(e) => handleFilterChange('available_slots_only', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Show only trips with available slots</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}