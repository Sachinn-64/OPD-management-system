import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Zap, Mic, Printer, Lock, AlertCircle } from 'lucide-react';
import { signIn } from '../../lib/firebase/auth'; // Updated import
import { useAuthStore } from '../../store/authStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, isAuthenticated, user } = useAuthStore(); // Updated to setUser
  
  const [formData, setFormData] = useState({
    email: '', // Changed to email
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const quotes = [
    'Save time on paperwork. Focus on what matters — your patients.',
    'Built for modern healthcare — fast OPD entry & smart workflows.',
    'Dictate notes hands-free. Voice enabled clinical documentation.',
    'Professional, print-ready prescriptions and reports.',
    'Secure, HIPAA-compliant data protection for patient privacy.',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated && user) {
      // Navigate based on role
      if (user.roles.includes('admin')) {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.roles.includes('doctor')) {
        navigate('/doctor/dashboard', { replace: true });
      } else if (user.roles.includes('receptionist')) {
        navigate('/reception/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const loginMutation = useMutation({
    mutationFn: (data: typeof formData) => signIn(data.email, data.password),
    onSuccess: (user) => {
      setUser(user);
      
      // Navigate based on role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else if (user.role === 'receptionist') {
        navigate('/reception/dashboard');
      } else {
        navigate('/dashboard');
      }
    },
    onError: (err: any) => {
      let errorMessage = 'Login failed. Please try again.';
      
      // Handle specific error messages
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message?.includes('Network Error') || err.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message?.includes('timeout')) {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please ensure the server is running and try again.';
      }
      
      setError(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-emerald-50/50 flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Animated gradient mesh */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-emerald-100/30 animate-[morphBg_20s_ease-in-out_infinite]"></div>
        </div>
        
        {/* Large floating circles with glow */}
        <div className="absolute -top-20 -left-20 w-125 h-125 bg-emerald-200/40 rounded-full blur-3xl animate-[floatLarge_12s_ease-in-out_infinite]"></div>
        <div className="absolute -bottom-32 -right-32 w-150 h-150 bg-emerald-300/30 rounded-full blur-3xl animate-[floatLarge_15s_ease-in-out_infinite_reverse]" style={{ animationDelay: '-5s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-100 h-100 bg-emerald-200/25 rounded-full blur-2xl animate-[floatLarge_18s_ease-in-out_infinite]" style={{ animationDelay: '-8s' }}></div>
        
        {/* Floating geometric shapes - more visible */}
        <div className="absolute top-[10%] left-[8%] w-72 h-72 border-2 border-emerald-300/50 rounded-3xl animate-[float_8s_ease-in-out_infinite] backdrop-blur-[2px]"></div>
        <div className="absolute top-[55%] left-[3%] w-40 h-40 border-2 border-emerald-400/40 rounded-2xl animate-[float_10s_ease-in-out_infinite_reverse]" style={{ animationDelay: '-3s' }}></div>
        <div className="absolute top-[5%] right-[12%] w-56 h-56 border-2 border-emerald-300/40 rounded-full animate-[spin_30s_linear_infinite]"></div>
        <div className="absolute bottom-[15%] right-[8%] w-48 h-48 border-2 border-emerald-400/50 rounded-3xl animate-[float_12s_ease-in-out_infinite_reverse]" style={{ animationDelay: '-2s' }}></div>
        <div className="absolute top-[35%] right-[20%] w-32 h-32 border-2 border-emerald-300/60 rounded-xl animate-[float_9s_ease-in-out_infinite]" style={{ animationDelay: '-4s' }}></div>
        <div className="absolute bottom-[40%] left-[15%] w-24 h-24 border-2 border-emerald-400/45 rounded-full animate-[float_7s_ease-in-out_infinite]" style={{ animationDelay: '-1s' }}></div>
        
        {/* Animated rings */}
        <div className="absolute top-[20%] right-[5%] w-64 h-64">
          <div className="absolute inset-0 border-2 border-emerald-300/30 rounded-full animate-[ripple_4s_ease-out_infinite]"></div>
          <div className="absolute inset-0 border-2 border-emerald-300/30 rounded-full animate-[ripple_4s_ease-out_infinite]" style={{ animationDelay: '-2s' }}></div>
        </div>
        <div className="absolute bottom-[25%] left-[10%] w-48 h-48">
          <div className="absolute inset-0 border-2 border-emerald-400/25 rounded-full animate-[ripple_5s_ease-out_infinite]"></div>
          <div className="absolute inset-0 border-2 border-emerald-400/25 rounded-full animate-[ripple_5s_ease-out_infinite]" style={{ animationDelay: '-2.5s' }}></div>
        </div>
        
        {/* Floating dots - more visible */}
        <div className="absolute top-[20%] left-[25%] w-3 h-3 bg-emerald-500/50 rounded-full animate-[floatDot_6s_ease-in-out_infinite]"></div>
        <div className="absolute top-[65%] left-[12%] w-2.5 h-2.5 bg-emerald-600/40 rounded-full animate-[floatDot_8s_ease-in-out_infinite]" style={{ animationDelay: '-2s' }}></div>
        <div className="absolute top-[30%] right-[18%] w-3 h-3 bg-emerald-500/45 rounded-full animate-[floatDot_7s_ease-in-out_infinite]" style={{ animationDelay: '-3s' }}></div>
        <div className="absolute bottom-[35%] right-[25%] w-2 h-2 bg-emerald-600/50 rounded-full animate-[floatDot_5s_ease-in-out_infinite]" style={{ animationDelay: '-1s' }}></div>
        <div className="absolute top-[45%] left-[5%] w-2.5 h-2.5 bg-emerald-500/55 rounded-full animate-[floatDot_9s_ease-in-out_infinite]" style={{ animationDelay: '-4s' }}></div>
        <div className="absolute bottom-[20%] left-[30%] w-2 h-2 bg-emerald-400/60 rounded-full animate-[floatDot_6s_ease-in-out_infinite]" style={{ animationDelay: '-2.5s' }}></div>
        
        {/* Moving lines */}
        <div className="absolute top-0 left-[15%] w-0.5 h-32 bg-emerald-400/30 rounded-full animate-[dropLine_8s_ease-in-out_infinite]"></div>
        <div className="absolute top-0 left-[35%] w-0.5 h-24 bg-emerald-300/25 rounded-full animate-[dropLine_10s_ease-in-out_infinite]" style={{ animationDelay: '-3s' }}></div>
        <div className="absolute top-0 right-[25%] w-0.5 h-28 bg-emerald-400/35 rounded-full animate-[dropLine_7s_ease-in-out_infinite]" style={{ animationDelay: '-5s' }}></div>
        <div className="absolute top-0 right-[10%] w-0.5 h-20 bg-emerald-300/30 rounded-full animate-[dropLine_9s_ease-in-out_infinite]" style={{ animationDelay: '-2s' }}></div>
        
        {/* Corner accents */}
        <div className="absolute top-8 left-8 w-32 h-32 border-l-2 border-t-2 border-emerald-300/40 rounded-tl-3xl animate-[fadeInOut_4s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-8 right-8 w-32 h-32 border-r-2 border-b-2 border-emerald-300/40 rounded-br-3xl animate-[fadeInOut_4s_ease-in-out_infinite]" style={{ animationDelay: '-2s' }}></div>
      </div>
      
      {/* Custom keyframes via style tag */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
        @keyframes floatLarge {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes floatDot {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { transform: translateY(-40px) scale(1.2); opacity: 1; }
        }
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes dropLine {
          0% { transform: translateY(-100%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(calc(100vh + 100%)); opacity: 0; }
        }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes morphBg {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(0deg); }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: rotate(180deg); }
        }
      `}</style>
      <div className="w-full max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Hero Section */}
          <div className="lg:col-span-7 p-8 -mt-12 lg:-mt-16">
            <div>
              {/* Logo */}
              <div className="mb-4">
                <img src="/logo.jpeg" alt="Logo" className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl shadow-md" />
              </div>
              
              {/* Title */}
              <div className="mb-4">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">OPD</h1>
                <h1 className="text-3xl lg:text-4xl font-bold text-emerald-600">Management</h1>
              </div>
              
              <p className="text-gray-600 text-base lg:text-lg mb-8">Streamline your outpatient care with modern technology</p>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3 border border-emerald-100/60 shadow-sm hover:shadow-md hover:border-emerald-200/80 transition-all duration-300">
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Lightning Fast</h3>
                    <p className="text-xs text-gray-600 mt-1">Complete OPD entry in under 60 seconds</p>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3 border border-emerald-100/60 shadow-sm hover:shadow-md hover:border-emerald-200/80 transition-all duration-300">
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <Mic className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Voice Enabled</h3>
                    <p className="text-xs text-gray-600 mt-1">Dictate notes completely hands-free</p>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3 border border-emerald-100/60 shadow-sm hover:shadow-md hover:border-emerald-200/80 transition-all duration-300">
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <Printer className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Print Ready</h3>
                    <p className="text-xs text-gray-600 mt-1">Professional prescription output</p>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 flex items-start gap-3 border border-emerald-100/60 shadow-sm hover:shadow-md hover:border-emerald-200/80 transition-all duration-300">
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <Lock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Secure</h3>
                    <p className="text-xs text-gray-600 mt-1">HIPAA compliant data protection</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Section */}
            <div className="border-l-4 border-emerald-400 pl-6 my-16 py-4 bg-white/50 backdrop-blur-sm rounded-r-lg">
              <p className="text-gray-700 italic text-sm lg:text-base transition-opacity duration-500">
                {quotes[quoteIndex]}
              </p>
              <p className="text-emerald-600 text-xs lg:text-sm mt-2 font-medium">— Built for Modern Healthcare</p>
            </div>
          </div>

          {/* Right Form Section */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="w-full max-w-md">
              {/* Login Card */}
              <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-emerald-100/50 p-6 lg:p-8">
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
                  <p className="text-gray-600 mt-1">Access your OPD portal</p>
                </div>

                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                      autoComplete="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-gray-700">Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loginMutation.isPending ? (
                      <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : null}
                    {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
                <div className="mt-6 text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    New to OPD System?{' '}
                    <Link
                      to="/register"
                      className="text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      Create an account
                    </Link>
                  </p>
                  <p className="text-sm text-gray-600">
                    New clinic?{' '}
                    <Link
                      to="/register-clinic"
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Register Your Clinic
                    </Link>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center text-xs lg:text-sm text-gray-500">
                <p className="flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Your data is encrypted and secure
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
