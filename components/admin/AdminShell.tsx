'use client'

import { useState, type ReactNode } from 'react'
import AdminTopbar from './AdminTopbar'
import ViviDrawer from './ViviDrawer'
import { ToastProvider } from '@/components/ui/Toast'

interface AdminShellProps {
  adminName: string
  unreadCount?: number
  children: ReactNode
}

/**
 * Client-side wrapper around admin page content.
 *
 * Owns:
 *  - Vivi drawer open/close state — both the topbar (above the content)
 *    and the drawer (overlayed) read from this state, so they live
 *    together in one client tree while the surrounding
 *    `app/admin/layout.tsx` stays a server component.
 *  - <ToastProvider> for any admin page that wants to call useToast().
 */
export default function AdminShell({ adminName, unreadCount = 0, children }: AdminShellProps) {
  const [viviOpen, setViviOpen] = useState(false)

  return (
    <ToastProvider>
      <AdminTopbar
        adminName={adminName}
        unreadCount={unreadCount}
        onViviOpen={() => setViviOpen(true)}
      />
      {children}
      <ViviDrawer open={viviOpen} onClose={() => setViviOpen(false)} />
    </ToastProvider>
  )
}
