'use client'

import { useState } from 'react'

type PlayerPhotoProps = {
  src: string | null | undefined
  alt: string
  size: number
  className?: string
  fallbackClassName?: string
}

function initials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function PlayerPhoto({ src, alt, size, className = '', fallbackClassName = '' }: PlayerPhotoProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-700 text-gray-200 font-black ${fallbackClassName}`}>
        {initials(alt)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
