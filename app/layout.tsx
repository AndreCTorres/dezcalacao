import './globals.css'

export const metadata = {
  title: 'Dezcalação',
  description: 'Fantasy draft da Copa do Mundo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
