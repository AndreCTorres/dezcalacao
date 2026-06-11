'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type ModeSwitcherProps = {
  isAdmin: boolean
  currentMode?: 'admin' | 'participant'
}

export function ModeSwitcher({ isAdmin, currentMode }: ModeSwitcherProps) {
  const pathname = usePathname()
  const inAdmin = pathname.startsWith('/admin')

  if (!isAdmin) return null

  return (
    <div className="flex gap-2 items-center bg-gray-800/50 rounded-lg p-1 border border-gray-700">
      <Link
        href="/admin"
        className={`px-3 py-1 rounded text-sm font-medium transition ${
          inAdmin
            ? 'bg-lime-400 text-gray-900'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        ⚙️ Admin
      </Link>
      <Link
        href="/app"
        className={`px-3 py-1 rounded text-sm font-medium transition ${
          !inAdmin
            ? 'bg-lime-400 text-gray-900'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        👤 Participante
      </Link>
    </div>
  )
}
