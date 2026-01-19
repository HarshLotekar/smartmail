import { motion } from "framer-motion";

const steps = [
  { num: 1, title: "Connect Your Gmail", desc: "Authorize SmartMail securely via Google OAuth." },
  { num: 2, title: "AI Organizes Inbox", desc: "Emails are auto-labeled and summarized by AI." },
  { num: 3, title: "Read & Reply Faster", desc: "View summaries and send smart replies instantly." },
];

export default function StepsSection() {
  return (
    <section className="py-24 text-center">
      <h2 className="text-4xl font-bold mb-12 text-text-primary">How SmartMail Works</h2>
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 px-6">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className="glass-card rounded-2xl shadow-md p-8 hover:shadow-plum-glow transition-all"
          >
            <div className="text-5xl font-bold gradient-text mb-3">{s.num}</div>
            <h3 className="text-xl font-semibold mb-2 text-text-primary">{s.title}</h3>
            <p className="text-text-secondary">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
