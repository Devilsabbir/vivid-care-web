'use client'

import { type ReactNode } from 'react'
import Tabs, { type TabItem } from '@/components/ui/Tabs'

interface ProfileTab {
  key: string
  label: string
  content: ReactNode
}

export default function ProfileTabs({
  tabs,
  active,
  onChange,
  ariaLabel = 'Profile sections',
}: {
  tabs: ProfileTab[]
  active: string
  onChange: (key: string) => void
  ariaLabel?: string
}) {
  const items: TabItem[] = tabs.map(t => ({ key: t.key, label: t.label }))
  const activeTab = tabs.find(t => t.key === active)

  return (
    <div>
      <Tabs items={items} active={active} onChange={onChange} ariaLabel={ariaLabel} />
      <div role="tabpanel" aria-label={activeTab?.label} className="mt-6">
        {activeTab?.content}
      </div>
    </div>
  )
}
