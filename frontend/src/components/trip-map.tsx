"use client"

import { useEffect, useRef } from "react"

interface Activity {
  activity: string
  location: string
  coordinates?: [number, number]
}

interface TripMapProps {
  route: [number, number][]
  activities: Activity[]
}

export default function TripMap({ route, activities }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const initializeMap = async () => {
      const L = await import("leaflet")
      await import("leaflet/dist/leaflet.css")

      if (!mapRef.current || mapInstanceRef.current) return

      // Delay to ensure container is mounted and visible
      setTimeout(() => {
        const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(map)

        if (route && route.length > 0) {
          const polyline = L.polyline(route, { color: "#4f46e5", weight: 4 }).addTo(map)
          map.fitBounds(polyline.getBounds())
        }

        activities.forEach((activity) => {
          if (activity.coordinates) {
            const marker = L.marker(activity.coordinates).addTo(map)
            marker.bindPopup(`
              <div>
                <h3 style="margin: 0 0 8px 0; font-weight: bold;">${activity.activity}</h3>
                <p style="margin: 0; color: #666;">${activity.location}</p>
              </div>
            `)
          }
        })

        mapInstanceRef.current = map
      }, 0)
    }

    initializeMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [route, activities])

  return <div ref={mapRef} className="w-full h-full" style={{ minHeight: "300px" }} />
}
