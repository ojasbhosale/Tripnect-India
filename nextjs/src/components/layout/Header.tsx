'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { MapPin, Plus, User, LogOut, Menu, X } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function Header() {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <MapPin className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">TripNect India</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/explore" className="text-gray-700 hover:text-indigo-600 transition-colors">
              Explore Trips
            </Link>
            {user && (
              <>
                <Link href="/my-trips" className="text-gray-700 hover:text-indigo-600 transition-colors">
                  My Trips
                </Link>
                <Link href="/requests" className="text-gray-700 hover:text-indigo-600 transition-colors">
                  Requests
                </Link>
              </>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/create-trip">
                  <Button size="sm" className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Create Trip</span>
                  </Button>
                </Link>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-3">
              <Link 
                href="/explore" 
                className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                Explore Trips
              </Link>
              {user && (
                <>
                  <Link 
                    href="/my-trips" 
                    className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-1"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Trips
                  </Link>
                  <Link 
                    href="/requests" 
                    className="text-gray-700 hover:text-indigo-600 transition-colors px-2 py-1"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Requests
                  </Link>
                  <Link 
                    href="/create-trip" 
                    className="px-2 py-1"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button size="sm" className="w-full flex items-center justify-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Create Trip</span>
                    </Button>
                  </Link>
                </>
              )}
              {user ? (
                <div className="flex items-center justify-between px-2 py-1 border-t border-gray-200 pt-3 mt-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      logout()
                      setMobileMenuOpen(false)
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2 px-2 border-t border-gray-200 pt-3 mt-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full">Login</Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button size="sm" className="w-full">Sign Up</Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}