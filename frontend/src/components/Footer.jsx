import React from "react";

export default function Footer() {
  return (
    <footer className="text-center py-6 text-gray-600 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-slate-800 mt-10">
      © {new Date().getFullYear()} <span className="font-semibold text-brand-teal">SmartMail</span> — Built with <span className="text-brand-sand">💙</span> and AI
    </footer>
  );
}
