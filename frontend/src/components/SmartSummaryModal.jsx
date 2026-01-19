import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SmartSummaryModal({ open, onClose, summary, onMarkRead, onDelete, onUnsubscribe }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-semibold">Smart Summary</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
            </div>
            <p className="mt-3 text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{summary || 'No summary available.'}</p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button onClick={onMarkRead} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">Mark Read</button>
              <button onClick={onUnsubscribe} className="px-4 py-2 rounded-xl bg-accent-100 text-accent-700 hover:bg-accent-200">Unsubscribe</button>
              <button onClick={onDelete} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600">Delete</button>
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700">Keep</button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
