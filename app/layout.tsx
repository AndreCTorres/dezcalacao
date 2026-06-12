import './globals.css'
import localFont from 'next/font/local'
import { ToastContainer } from '@/app/components/toast'

// Fontes locais — evita falha de build em ambientes sem acesso à rede (ex: Vercel Edge, CI offline)
// Arquivos em public/fonts/ (baixados do Google Fonts)
const anton = localFont({
  src: '../public/fonts/Anton-Regular.ttf',
  variable: '--font-anton',
  display: 'swap',
  fallback: ['Impact', 'Arial Narrow', 'sans-serif'],
})

// Hanken Grotesk como variable font (cobre pesos 100–900)
const hanken = localFont({
  src: '../public/fonts/HankenGrotesk-Regular.ttf',
  variable: '--font-hanken',
  display: 'swap',
  fallback: ['system-ui', 'Helvetica Neue', 'Arial', 'sans-serif'],
})

const spaceMono = localFont({
  src: [
    { path: '../public/fonts/SpaceMono-Regular.ttf', weight: '400' },
    { path: '../public/fonts/SpaceMono-Bold.ttf', weight: '700' },
  ],
  variable: '--font-space-mono',
  display: 'swap',
  fallback: ['Courier New', 'monospace'],
})

export const metadata = {
  title: 'Dezcalação',
  description: 'Fantasy draft da Copa do Mundo',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${anton.variable} ${hanken.variable} ${spaceMono.variable}`}>
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  )
}
