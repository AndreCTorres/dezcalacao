'use client'

import { useState } from 'react'
import { EditProfileModal } from './edit-profile-modal'

type ProfileEditButtonProps = {
  memberId: string
  currentDisplayName: string
  currentTeamName?: string | null
}

export function ProfileEditButton({
  memberId,
  currentDisplayName,
  currentTeamName,
}: ProfileEditButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const handleSuccess = () => {
    // Força reload da página
    setReloadKey((prev) => prev + 1)
    window.location.reload()
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-lime-400/20 hover:bg-lime-400/30 border border-lime-400/50 text-lime-400 text-sm font-medium rounded-lg transition"
        title="Editar perfil e nome do time"
      >
        ✏️ Editar Perfil
      </button>

      {showModal && (
        <EditProfileModal
          key={reloadKey}
          memberId={memberId}
          currentDisplayName={currentDisplayName}
          currentTeamName={currentTeamName}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
