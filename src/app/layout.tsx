import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LLM Hippodrome - AI Debate Arena',
  description: 'Watch AI models debate and come to a shared conclusion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <main className="container mx-auto p-4 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  )
} 