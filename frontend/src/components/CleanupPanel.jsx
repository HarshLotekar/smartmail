import React, { useMemo } from 'react'
import { Card, CardContent } from './ui/Card'

export default function CleanupPanel({ emails = [], onDeleteMany }) {
  const candidates = useMemo(() => {
    const now = Date.now()
    const cutoff = 45 * 24 * 60 * 60 * 1000
    return emails.filter(e => {
      const date = new Date(e.date || e.received_at || Date.now()).getTime()
      const ageOk = now - date > cutoff
      const unread = !e.is_read
      const promo = /promo|newsletter|updates|social/i.test(e.ai_category || e.aiCategory || '')
      return ageOk && unread && promo
    })
  }, [emails])

  if (!candidates.length) return null

  return (
    <Card className="mt-4">
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-accent-100 text-accent-700 px-2 py-0.5 text-xs border border-accent-200">AI Suggestion</span>
              <span>Inbox cleanup</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{candidates.length} emails look unimportant (unread for over 45 days)</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => alert('Preview coming soon')} className="px-3 py-2 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100">Preview</button>
            <button onClick={() => onDeleteMany?.(candidates)} className="px-3 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600">Delete All</button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
