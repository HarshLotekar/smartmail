import React from 'react'
import SettingsPanel from '../components/SettingsPanel'
import { Settings as SettingsIcon } from 'lucide-react'

export default function Settings() {
  return (
    <div className="h-full overflow-y-auto bg-dark-bg">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text-primary flex items-center gap-3">
            <SettingsIcon className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-dark-text-secondary mt-2">
            Manage your preferences and account settings
          </p>
        </div>
        <SettingsPanel />
      </div>
    </div>
  )
}
