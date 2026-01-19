import React from 'react'
import { motion } from 'framer-motion'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    features: ['Basic smart inbox', 'Manual sync', 'Email summaries (10/mo)'],
    cta: 'Start Free'
  },
  {
    name: 'Pro',
    highlight: true,
    price: '$12',
    period: '/mo',
    features: ['Unlimited summaries', 'Auto cleanups', 'Smart replies', 'Priority support'],
    cta: 'Start Free Trial'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['SAML/SSO', 'Advanced controls', 'On-prem or VPC', 'Dedicated support'],
    cta: 'Contact Sales'
  }
]

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-text-primary">Simple, transparent pricing</h2>
          <p className="mt-3 text-text-secondary">Start free. Upgrade when you're ready.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card rounded-2xl p-6 transition-all ${p.highlight ? 'border-accent-primary shadow-plum-glow' : 'border-card-border hover:shadow-plum-glow'}`}
            >
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl font-semibold text-text-primary">{p.name}</h3>
                {p.highlight && <span className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary">Popular</span>}
              </div>
              <div className="mt-4 flex items-end gap-1">
                <div className="text-4xl font-bold gradient-text">{p.price}</div>
                <div className="text-text-secondary">{p.period}</div>
              </div>
              <ul className="mt-6 space-y-2 text-text-secondary">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`mt-8 w-full py-2.5 rounded-xl font-semibold transition-all ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}>{p.cta}</button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
