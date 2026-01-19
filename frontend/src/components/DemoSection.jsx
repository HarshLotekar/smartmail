import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function DemoSection() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      image: '/screenshots/inbox.png',
      title: '📧 Inbox View',
      description: 'Smart categorization and organization at a glance'
    },
    {
      image: '/screenshots/email-detail.png',
      title: '✨ AI Summary',
      description: 'Instant email summaries powered by AI'
    },
    {
      image: '/screenshots/analytics.png',
      title: '📊 Analytics Dashboard',
      description: 'Insights into your email patterns and productivity'
    },
    {
      image: '/screenshots/smart-reply.png',
      title: '🤖 Smart Reply',
      description: 'AI-powered reply suggestions in seconds'
    }
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }
  return (
    <section id="demo" className="relative py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-text-primary">See SmartMail in Action</h2>
          <p className="mt-3 text-text-secondary">A glimpse of your new inbox—clean, organized, and fast.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card rounded-2xl overflow-hidden shadow-plum-glow border border-card-border"
        >
          {/* Slider Container */}
          <div className="relative">
            {/* Slides */}
            <div className="aspect-video bg-gradient-to-br from-primary-500/10 to-accent-300/10 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <img
                    src={slides[currentSlide].image}
                    alt={slides[currentSlide].title}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextElementSibling.style.display = 'flex'
                    }}
                  />
                  <div className="hidden absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-300/20 items-center justify-center">
                    <div className="text-center p-6">
                      <div className="text-2xl font-semibold text-white mb-2">{slides[currentSlide].title}</div>
                      <p className="text-white/70">{slides[currentSlide].description}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
              >
                <ChevronLeft className="w-6 h-6 text-primary-600" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
              >
                <ChevronRight className="w-6 h-6 text-primary-600" />
              </button>
            </div>

            {/* Slide Info */}
            <div className="p-6 text-center bg-gradient-to-r from-primary-500/5 to-accent-300/5">
              <motion.h3
                key={`title-${currentSlide}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-bold gradient-text mb-2"
              >
                {slides[currentSlide].title}
              </motion.h3>
              <motion.p
                key={`desc-${currentSlide}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-text-secondary"
              >
                {slides[currentSlide].description}
              </motion.p>
            </div>

            {/* Dot Indicators */}
            <div className="flex justify-center gap-2 pb-6">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`transition-all ${
                    index === currentSlide
                      ? 'w-8 h-2 bg-gradient-to-r from-primary-500 to-accent-300'
                      : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                  } rounded-full`}
                />
              ))}
            </div>
          </div>

          {/* Callouts */}
          <div className="grid md:grid-cols-3 gap-6 p-6">
            {[
              { title: 'Smart Summaries', desc: 'AI distills long emails into quick bullet points.' },
              { title: 'One-click Replies', desc: 'Generate and send polished responses instantly.' },
              { title: 'Clean Categorization', desc: 'Labels like Work, Personal, Promotions, and more.' }
            ].map((c, i) => (
              <div key={i} className="glass-card rounded-xl p-4 border border-card-border hover:shadow-plum-glow transition-all">
                <div className="text-sm font-semibold text-text-primary">{c.title}</div>
                <div className="text-sm text-text-secondary mt-1">{c.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
