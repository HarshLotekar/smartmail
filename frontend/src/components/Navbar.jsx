import React from "react";

export default function Navbar({ onConnect }) {
  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className="w-full flex justify-between items-center px-6 md:px-12 py-5 bg-white/80 backdrop-blur-sm border-b border-light-text-secondary/10 fixed top-0 z-50">
      <button onClick={() => scrollTo('hero')} className="text-xl font-semibold text-light-text-primary">
        SmartMail
      </button>

      <div className="hidden md:flex items-center gap-8">
        <button className="text-light-text-secondary hover:text-light-text-primary transition-colors text-sm font-medium" onClick={() => scrollTo('features')}>Features</button>
        <button className="text-light-text-secondary hover:text-light-text-primary transition-colors text-sm font-medium" onClick={() => scrollTo('demo')}>Demo</button>
        <button className="text-light-text-secondary hover:text-light-text-primary transition-colors text-sm font-medium" onClick={() => scrollTo('pricing')}>Pricing</button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onConnect}
          className="px-4 py-2 text-sm font-medium text-light-text-secondary hover:text-light-text-primary transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={onConnect}
          className="btn-primary"
        >
          Get Started
        </button>
      </div>
    </nav>
  );
}
