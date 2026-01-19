import { motion } from "framer-motion";

export default function CTASection({ onConnect }) {
  return (
    <section className="py-24 text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="text-4xl font-bold mb-6 gradient-text"
      >
        Ready to declutter your inbox?
      </motion.h2>
      <motion.button
        whileHover={{ scale: 1.05 }}
        onClick={onConnect}
        className="btn-primary px-8 py-3 font-semibold rounded-xl"
      >
        Connect SmartMail with Google
      </motion.button>
    </section>
  );
}
