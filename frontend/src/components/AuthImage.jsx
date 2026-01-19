import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Image component that loads images with authentication
 * Used for displaying attachment thumbnails that require auth headers
 */
export default function AuthImage({ src, alt, className, onError }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      if (!src) {
        setLoading(false)
        setError(true)
        return
      }

      try {
        setLoading(true)
        setError(false)

        const response = await fetch(src, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('smartmail_token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load image')
        }

        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)

        if (isMounted) {
          setImageSrc(objectUrl)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error loading image:', err)
        if (isMounted) {
          setError(true)
          setLoading(false)
          if (onError) onError(err)
        }
      }
    }

    loadImage()

    // Cleanup function
    return () => {
      isMounted = false
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [src])

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <p className="text-gray-500 text-sm">Preview unavailable</p>
      </div>
    )
  }

  return (
    <img 
      src={imageSrc} 
      alt={alt} 
      className={className}
      onError={() => {
        setError(true)
        if (onError) onError()
      }}
    />
  )
}
