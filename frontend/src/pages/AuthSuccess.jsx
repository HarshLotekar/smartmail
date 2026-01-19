import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiHelpers } from '../services/api';

/**
 * Auth Success Page
 * Handles OAuth callback with JWT token
 */
export default function AuthSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get token from URL parameter
      const token = searchParams.get('token');

      if (!token) {
        console.error('❌ No token in callback URL');
        navigate('/?error=no_token');
        return;
      }

      console.log('✅ Token received from OAuth callback');

      // Store token in localStorage
      apiHelpers.setAuthToken(token);

      // Decode JWT to get user data (basic decode without verification)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('✅ Token decoded:', payload);

      // Fetch full user profile from backend
      try {
        const response = await fetch(
          window.location.hostname.includes('onrender.com')
            ? 'https://smartmail-w4ff.onrender.com/api/auth/check'
            : 'http://localhost:3001/api/auth/check',
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const data = await response.json();
        
        if (data.success && data.user) {
          // Login with full user data
          login(data.user, token);
          console.log('✅ User authenticated:', data.user.email);
          
          // Redirect to inbox
          navigate('/inbox');
        } else {
          throw new Error('Invalid user data from server');
        }
      } catch (fetchError) {
        console.error('❌ Failed to fetch user profile:', fetchError);
        
        // Fallback: use payload data
        const fallbackUser = {
          id: payload.userId,
          email: payload.email,
          google_id: payload.googleId
        };
        login(fallbackUser, token);
        navigate('/inbox');
      }

    } catch (error) {
      console.error('❌ Auth callback error:', error);
      navigate('/?error=auth_failed');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent-primary mx-auto mb-4"></div>
        <h2 className="text-xl text-text-primary font-semibold">Completing sign in...</h2>
        <p className="text-text-secondary mt-2">Please wait while we set up your account</p>
      </div>
    </div>
  );
}
