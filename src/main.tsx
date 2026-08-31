import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { Toaster } from "@/components/ui/sonner"

import { routeTree } from './routeTree.gen'
import { startThemeSync } from '@/stores/use-store-preferences'
import './index.css'

// Apply the persisted theme before first paint and keep `.dark` in sync.
startThemeSync()

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster position="bottom-right" />
  </StrictMode>,
)
