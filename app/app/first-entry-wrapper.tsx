'use client'

import { useState, useEffect } from 'react'
import { FirstEntryDialog } from './first-entry-dialog'

interface FirstEntryWrapperProps {
  memberId: string
  currentDisplayName: string
  currentTeamName: string | null
  children: React.ReactNode
}

export function FirstEntryWrapper({
  memberId,
  currentDisplayName,
  currentTeamName,
  children,
}: FirstEntryWrapperProps) {
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    // Verificar se é a primeira entrada (localStorage)
    const hasSeenFirstEntry = localStorage.getItem(`first-entry-${memberId}`)
    
    // Mostrar dialog se:
    // 1. Nunca viu antes (primeira entrada)
    // 2. Não tem nome de time definido
    if (!hasSeenFirstEntry && !currentTeamName) {
      setShowDialog(true)
    }
  }, [memberId, currentTeamName])

  const handleDialogComplete = () => {
    setShowDialog(false)
    // Recarregar página para pegar dados atualizados
    window.location.reload()
  }

  return (
    <>
      {showDialog && (
        <FirstEntryDialog
          memberId={memberId}
          currentDisplayName={currentDisplayName}
          currentTeamName={currentTeamName}
          onComplete={handleDialogComplete}
        />
      )}
      {children}
    </>
  )
}
