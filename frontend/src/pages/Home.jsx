import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { 
  Mail, 
  Shield, 
  Zap, 
  Sparkles, 
  CheckCircle, 
  Lock, 
  Users, 
  Briefcase, 
  Code, 
  GraduationCap,
  ChevronDown,
  ExternalLink
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleConnect = () => {
    navigate("/trust");
  };

  useEffect(() => {
    if (user) {
      navigate("/inbox");
    } else {
      // Check for token/user in URL (after Google OAuth)
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const userParam = params.get("user");
      if (token && userParam) {
        localStorage.setItem("smartmail_token", token);
        localStorage.setItem("smartmail_user", userParam);
        navigate("/inbox");
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen light bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#4F8CFF] flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SmartMail</span>
          </div>
          <button
            onClick={handleConnect}
            className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            Connect Gmail
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
            AI-Powered Email Management
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight text-gray-900">
            Stop drowning in email.
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Start focusing on what matters.
            </span>
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-600 mb-10 leading-relaxed">
            SmartMail uses AI to automatically prioritize your inbox, summarize long threads, and suggest cleanup actions—so you can get to Inbox Zero without the stress.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleConnect}
              className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Connect Gmail
            </button>
            <a
              href="#how-it-works"
              className="border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold transition-all"
            >
              See How It Works
            </a>
          </div>
          <p className="mt-6 text-sm text-gray-500">No credit card required • Takes 30 seconds</p>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <Shield className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-900 mb-1">Secure Gmail Integration</p>
              <p className="text-sm text-gray-600">Uses official Google OAuth</p>
            </div>
            <div>
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-900 mb-1">Built for Cluttered Inboxes</p>
              <p className="text-sm text-gray-600">Handles 1000s of emails effortlessly</p>
            </div>
            <div>
              <Lock className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-900 mb-1">Privacy First</p>
              <p className="text-sm text-gray-600">Your data stays yours</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900">
            How SmartMail Works
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            Get started in three simple steps. No configuration required.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Connect Gmail Securely</h3>
              <p className="text-gray-600 leading-relaxed">
                Authenticate with Google OAuth in seconds. We never see or store your password.
              </p>
            </div>
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">AI Analyzes Your Inbox</h3>
              <p className="text-gray-600 leading-relaxed">
                Our AI learns your email patterns and identifies what's urgent, promotional, or low-priority.
              </p>
            </div>
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Stay Organized Automatically</h3>
              <p className="text-gray-600 leading-relaxed">
                Your inbox stays prioritized and clean. Focus only on emails that need your attention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900">
            Powerful Features
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            Everything you need to take control of your inbox.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl">
              <Zap className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Smart Prioritization</h3>
              <p className="text-gray-700 leading-relaxed">
                AI automatically sorts emails by urgency. See what needs your attention first—always.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl">
              <Sparkles className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Instant AI Summaries</h3>
              <p className="text-gray-700 leading-relaxed">
                Get the gist of long email threads in seconds. No more scrolling through endless conversations.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl">
              <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Smart Cleanup</h3>
              <p className="text-gray-700 leading-relaxed">
                Find inactive promotional emails and unsubscribe suggestions. Clean your inbox in one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Security Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Shield className="w-16 h-16 text-blue-400 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Your Privacy is Our Priority
            </h2>
            <p className="text-xl text-gray-300">
              We take security seriously. Here's how we protect your data.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/10 backdrop-blur p-6 rounded-xl">
              <Lock className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="text-xl font-bold mb-2">Secure Gmail OAuth</h3>
              <p className="text-gray-300 leading-relaxed">
                We use Google's official OAuth system. Your password never touches our servers.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-xl">
              <Shield className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-xl font-bold mb-2">No Password Storage</h3>
              <p className="text-gray-300 leading-relaxed">
                We only receive a secure token from Google. We never store or see your credentials.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-xl">
              <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="text-xl font-bold mb-2">You Stay in Control</h3>
              <p className="text-gray-300 leading-relaxed">
                SmartMail never deletes or unsubscribes automatically. You approve every action.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-xl">
              <Lock className="w-8 h-8 text-yellow-400 mb-3" />
              <h3 className="text-xl font-bold mb-2">Data Privacy</h3>
              <p className="text-gray-300 leading-relaxed">
                Your data is never sold or shared. We use it only to provide you with email insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900">
            Built for Busy People
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            Whether you're a student, professional, or developer—SmartMail helps you stay on top of email.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Students</h3>
              <p className="text-gray-600">
                Stay on top of assignment emails, club updates, and career opportunities.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Professionals</h3>
              <p className="text-gray-600">
                Prioritize client emails and never miss an important deadline.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Code className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Developers</h3>
              <p className="text-gray-600">
                Cut through GitHub notifications and focus on code reviews that matter.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Job Seekers</h3>
              <p className="text-gray-600">
                Never miss a recruiter email or interview invitation again.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16">
            Everything you need to know about SmartMail.
          </p>
          <div className="space-y-6">
            {/* FAQ 1 */}
            <details className="bg-gray-50 p-6 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <summary className="font-bold text-lg text-gray-900 flex items-center justify-between">
                Is SmartMail safe to use?
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">
                Yes! SmartMail uses Google's official OAuth system, so we never see your password. Your data is encrypted and never shared with third parties.
              </p>
            </details>
            {/* FAQ 2 */}
            <details className="bg-gray-50 p-6 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <summary className="font-bold text-lg text-gray-900 flex items-center justify-between">
                Does SmartMail auto-delete emails?
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">
                No. SmartMail will never delete or unsubscribe automatically. All cleanup suggestions require your approval before any action is taken.
              </p>
            </details>
            {/* FAQ 3 */}
            <details className="bg-gray-50 p-6 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <summary className="font-bold text-lg text-gray-900 flex items-center justify-between">
                Can I disable AI features?
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">
                Yes. You can turn off Smart Cleanup suggestions in Settings. AI summaries and prioritization can be ignored—you'll still see all your emails.
              </p>
            </details>
            {/* FAQ 4 */}
            <details className="bg-gray-50 p-6 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <summary className="font-bold text-lg text-gray-900 flex items-center justify-between">
                What Gmail permissions does SmartMail need?
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">
                SmartMail needs read access to analyze your emails and write access to organize them (archive, mark as read). This is standard for email management apps.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Reclaim Your Inbox?
          </h2>
          <p className="text-xl mb-10 text-blue-100">
            Join thousands of users who've taken control of their email.
          </p>
          <button
            onClick={handleConnect}
            className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-5 rounded-xl text-xl font-bold transition-all shadow-2xl hover:shadow-3xl inline-flex items-center gap-3"
          >
            <Mail className="w-6 h-6" />
            Connect SmartMail with Google
          </button>
          <p className="mt-6 text-sm text-blue-100">
            Free to use • No credit card required • Disconnect anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#4F8CFF] flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">SmartMail</span>
            </div>
            <p className="text-sm text-gray-400">
              AI-powered email management for busy people.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-white mb-3">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#terms" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-3">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#help" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="mailto:support@smartmail.app" className="hover:text-white transition-colors">support@smartmail.app</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          © 2026 SmartMail. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
