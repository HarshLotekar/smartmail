import React from 'react'
import { motion } from 'framer-motion'

const testimonials = [
  {
    quote: 'SmartMail cut my email time in half. The summaries are spot-on and the cleanup is magical.',
    name: 'Alex Johnson',
    role: 'Founder, WaveLabs'
  },
  {
    quote: 'Best email experience I\'ve had. It feels like having an assistant inside my inbox.',
    name: 'Priya Sharma',
    role: 'Product Manager, Finely'
  },
  {
    quote: 'The smart labels and replies help our team ship faster. Absolutely essential now.',
    name: 'Diego Martínez',
    role: 'Engineering Lead, Novalabs'
  }
]

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-text-primary">Loved by busy teams</h2>
          <p className="mt-3 text-text-secondary">Real stories from people who email less and do more.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-2xl p-6 hover:shadow-plum-glow transition-all"
            >
              <p className="text-text-primary">"{t.quote}"</p>
              <div className="mt-4 text-sm text-text-muted">{t.name} — {t.role}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
