import React from "react";
import { Mail } from "lucide-react";

export default function HeroSection({ onConnect }) {
  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-6 py-20">
      <div className="max-w-4xl">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#4F8CFF] flex items-center justify-center">
            <Mail className="w-9 h-9 text-white" />
          </div>
        </div>
        
        {/* Hero Headline */}
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-[1.15] tracking-tight text-light-text-primary">
          Take control of email—
          <br />
          <span className="text-[#4F8CFF]">without thinking about it.</span>
        </h1>
        
        {/* Subheadline */}
        <p className="text-lg md:text-xl max-w-2xl mx-auto text-light-text-secondary mb-8 leading-relaxed">
          SmartMail automatically prioritizes, summarizes, and organizes your inbox.
        </p>
        
        {/* Primary CTA */}
        <button
          onClick={onConnect}
          className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg hover:shadow-xl"
        >
          Connect Gmail
        </button>
        
        {/* Proof Strip */}
        <div className="mt-12 flex items-center justify-center gap-6 text-sm text-light-text-secondary flex-wrap">
          <span>Organizes</span>
          <span className="w-1 h-1 rounded-full bg-light-text-secondary/30"></span>
          <span>Summarizes</span>
          <span className="w-1 h-1 rounded-full bg-light-text-secondary/30"></span>
          <span>Prioritizes</span>
          <span className="w-1 h-1 rounded-full bg-light-text-secondary/30"></span>
          <span>No setup required</span>
        </div>
      </div>
    </section>
  );
}
