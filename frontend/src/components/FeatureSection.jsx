import { Zap, FileText, TrendingUp } from "lucide-react";

const features = [
  {
    icon: <Zap className="w-8 h-8 text-[#4F8CFF]" />,
    title: "Smart Prioritization",
    desc: "Only emails that matter surface first",
  },
  {
    icon: <FileText className="w-8 h-8 text-[#4F8CFF]" />,
    title: "Instant Summaries",
    desc: "Understand long emails in seconds",
  },
  {
    icon: <TrendingUp className="w-8 h-8 text-[#4F8CFF]" />,
    title: "Inbox Insights",
    desc: "Know where your attention goes",
  },
];

export default function FeatureSection() {
  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center text-light-text-primary">
          Email management, simplified
        </h2>
        <p className="text-center text-light-text-secondary mb-16 max-w-2xl mx-auto">
          Focus on what matters. SmartMail handles the rest.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-[#4F8CFF]/30 hover:shadow-lg transition-all duration-200"
            >
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-semibold text-xl mb-3 text-light-text-primary">{f.title}</h3>
              <p className="text-light-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
