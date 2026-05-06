'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ClientHeader({
  clientName,
  initialUnreadCount,
  userId,
}: {
  clientName: string
  initialUnreadCount: number
  userId: string
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('client-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false)
            .then(({ count }) => setUnreadCount(count ?? 0))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#171717]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
        <Link href="/client/home" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Vivid Care" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8f8a80]">Client portal</p>
            <p className="font-headline text-sm font-semibold text-white">Vivid Care</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/client/home"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#f6f2ea] transition hover:bg-white/10"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#8B45A6] px-1 text-[10px] font-bold text-[#171717]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white">
            {clientName?.charAt(0).toUpperCase() ?? 'C'}
          </div>
        </div>
      </div>
    </header>
  )
}
