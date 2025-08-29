export interface User {
  id: number
  email: string
  name: string
  created_at: string
}

export interface Trip {
  id: number
  user_id: number
  host_id: number
  title: string
  destination: string
  start_date: string
  end_date: string
  description?: string
  open_slots: number
  budget_min?: number
  budget_max?: number
  preferences: Record<string, any>
  status: 'active' | 'completed' | 'cancelled'
  current_participants: number
  created_at: string
  updated_at: string
  host: User
  creator: User
}

export interface TripDetail extends Trip {
  participants: TripParticipant[]
}

export interface TripSummary {
  id: number
  title: string
  destination: string
  start_date: string
  end_date: string
  open_slots: number
  current_participants: number
  budget_min?: number
  budget_max?: number
  host: User
}

export interface TripRequest {
  id: number
  trip_id: number
  user_id: number
  status: 'pending' | 'accepted' | 'rejected'
  message?: string
  created_at: string
  user: User
  trip: TripSummary
}

export interface TripParticipant {
  id: number
  trip_id: number
  user_id: number
  role: 'host' | 'participant'
  joined_at: string
  user: User
}

export interface GroupChat {
  id: number
  trip_id: number
  name?: string
  created_at: string
}

export interface ChatMessage {
  id: number
  chat_id: number
  user_id: number
  message: string
  message_type: 'text' | 'image' | 'system'
  created_at: string
  user: User
}

export interface TripFeedResponse {
  trips: TripSummary[]
  total: number
  page: number
  per_page: number
}

export interface CreateTripData {
  title: string
  destination: string
  start_date: string
  end_date: string
  description?: string
  open_slots: number
  budget_min?: number
  budget_max?: number
  preferences: Record<string, any>
}

export interface TripFilters {
  destination?: string
  start_date_from?: string
  start_date_to?: string
  budget_min?: number
  budget_max?: number
  available_slots_only?: boolean
}