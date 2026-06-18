import { createActionClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { ChangePasswordForm } from './change-password-form'

export default async function ChangePasswordPage() {
  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0e0c' }}>
      <div
        className="w-full max-w-md rounded-2xl p-6 border"
        style={{ background: 'rgba(255,255,255,.04)', borderColor: 'rgba(197,242,74,.18)' }}
      >
        <p className="text-lime-400 text-xs font-bold uppercase tracking-widest mb-3">Primeiro acesso</p>
        <h1 className="text-white text-2xl font-black mb-2">Troque sua senha</h1>
        <p className="text-gray-400 text-sm mb-6">
          A senha inicial foi compartilhada com o grupo. Defina uma nova senha para proteger seu time.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
