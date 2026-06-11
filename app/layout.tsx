import './globals.css'
import { Anton, Hanken_Grotesk, Space_Mono } from 'next/font/google'
import { ToastContainer } from '@/app/components/toast'

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

const hanken = Hanken_Grotesk({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
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
