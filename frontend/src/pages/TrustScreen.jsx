import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle, 
  X, 
  Lock, 
  Mail, 
  Tag, 
  Archive,
  Eye,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { loginWithGoogle } from '../services/api';

export default function TrustScreen() {
  const navigate = useNavigate();

  const handleContinueToGoogle = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4 py-8">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#4F8CFF] flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-dark-text-primary">SmartMail</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-dark-text-primary mb-3">
            Before you connect Gmail
          </h1>
          <p className="text-lg text-dark-text-secondary">
            Here's exactly what SmartMail will and won't do.
          </p>
        </div>

        {/* What SmartMail Helps You With */}
        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-dark-text-primary mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            What SmartMail Helps You With
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-dark-text-secondary">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Automatically prioritizes important emails</span>
            </li>
            <li className="flex items-start gap-3 text-dark-text-secondary">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Groups promotional and low-priority emails</span>
            </li>
            <li className="flex items-start gap-3 text-dark-text-secondary">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Suggests cleanup for emails you haven't opened</span>
            </li>
            <li className="flex items-start gap-3 text-dark-text-secondary">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>Shows inbox insights like unread count and trends</span>
            </li>
          </ul>
        </div>

        {/* What SmartMail Will NEVER Do */}
        <div className="bg-dark-surface border border-red-900/30 rounded-xl p-6 mb-4">
          <h2 className="text-xl font-bold text-dark-text-primary mb-4 flex items-center gap-2">
            <X className="w-6 h-6 text-red-500" />
            What SmartMail Will NEVER Do
          </h2>
          <ul className="space-y-3 mb-4">
            <li className="flex items-start gap-3 text-dark-text-secondary">
              <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span>Never reads emails for ads</span>
            </li>
            <li className="flex items-start gap-3 text-dark-text-secondary">
              <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span>Never sends emails without you</span>
            </li>
            <li className="flex items-start gap-3 text-dark-text-secondary">
              <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span>Never deletes emails automatically</span>
            </li>
            <li className="flex items-start gap-3 text-dark-text-secondary">
              <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span>Never sells or shares your data</span>
            </li>
          </ul>
          <div className="pt-4 border-t border-dark-border">
            <p className="text-sm font-semibold text-[#4F8CFF] flex items-center gap-2">
              <Shield className="w-4 h-4" />
              You are always in control. Every action requires your approval.
            </p>
          </div>
        </div>

        {/* Why We Need Gmail Access */}
        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 mb-4">
          <h2 className="text-xl font-bold text-dark-text-primary mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-[#4F8CFF]" />
            Why We Need Gmail Access
          </h2>
          <div className="space-y-4 mb-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Eye className="w-5 h-5 text-dark-text-secondary mt-0.5" />
              </div>
              <div>
                <p className="font-semibold text-dark-text-primary mb-1">Read emails</p>
                <p className="text-sm text-dark-text-secondary">To detect priority and inactivity patterns</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Archive className="w-5 h-5 text-dark-text-secondary mt-0.5" />
              </div>
              <div>
                <p className="font-semibold text-dark-text-primary mb-1">Modify emails</p>
                <p className="text-sm text-dark-text-secondary">To apply labels or archive emails only when you choose</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Tag className="w-5 h-5 text-dark-text-secondary mt-0.5" />
              </div>
              <div>
                <p className="font-semibold text-dark-text-primary mb-1">View labels</p>
                <p className="text-sm text-dark-text-secondary">To organize your inbox correctly</p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-dark-border">
            <p className="text-sm text-dark-text-secondary">
              SmartMail cannot access your password, contacts, or Google Drive.
            </p>
          </div>
        </div>

        {/* Trust & Security Signals */}
        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-dark-text-primary mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-green-500" />
            Trust & Security
          </h2>
          <ul className="space-y-2 text-sm text-dark-text-secondary">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Uses Google-approved OAuth
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Secure, encrypted processing
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              You can disconnect anytime from Settings
            </li>
          </ul>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <button
            onClick={handleContinueToGoogle}
            className="w-full bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg hover:shadow-xl mb-4 flex items-center justify-center gap-2"
          >
            <Shield className="w-5 h-5" />
            Continue to Google — Secure Sign-In
            <ArrowRight className="w-5 h-5" />
          </button>
          <a
            href="#privacy"
            className="text-sm text-dark-text-secondary hover:text-[#4F8CFF] transition-colors inline-block"
          >
            View Privacy Policy
          </a>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-dark-text-secondary hover:text-dark-text-primary transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
