import { useState } from 'react';
import LogoMarkV from './imports/LogoMarkV1';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card } from './components/ui/card';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Toaster } from './components/ui/sonner';
import { IconPlaceholder } from './components/IconPlaceholder';

type View = 'landing' | 'login' | 'dashboard';

export default function App() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentView, setCurrentView] = useState<View>('landing');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Store email in localStorage for now
      const waitlist = JSON.parse(localStorage.getItem('waitlist') || '[]');
      waitlist.push({ email, timestamp: new Date().toISOString() });
      localStorage.setItem('waitlist', JSON.stringify(waitlist));
      
      setIsSubmitted(true);
      toast.success('Successfully joined the waitlist!');
      setEmail('');
    }
  };

  const handleLogin = () => {
    setCurrentView('login');
  };

  const handleLoginSuccess = () => {
    setCurrentView('dashboard');
    toast.success('Welcome back!');
  };

  const handleLogout = () => {
    setCurrentView('landing');
    toast.success('Logged out successfully');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  // Render Login Page
  if (currentView === 'login') {
    return <Login onLogin={handleLoginSuccess} onBack={handleBackToLanding} />;
  }

  // Render Dashboard
  if (currentView === 'dashboard') {
    return <Dashboard onLogout={handleLogout} />;
  }

  // Render Landing Page
  const features = [
    {
      iconLabel: 'OWN',
      title: 'Own Your Infrastructure',
      description: 'Take control of your data storage with plug-and-play installation on your own infrastructure.'
    },
    {
      iconLabel: 'SET',
      title: 'Effortless Setup',
      description: 'Get up and running in minutes with our streamlined installation process.'
    },
    {
      iconLabel: 'SEC',
      title: 'Secure & Private',
      description: 'Your memories stay on your infrastructure, ensuring complete privacy and security.'
    },
    {
      iconLabel: 'CST',
      title: 'Cost Efficient',
      description: 'Stop paying premium prices for cloud storage. Control costs with your own infrastructure.'
    }
  ];

  const technologies = [
    { name: 'Docker', label: 'DCK' },
    { name: 'Kubernetes', label: 'K8S' },
    { name: 'PostgreSQL', label: 'PSQL' },
    { name: 'Redis', label: 'RDS' },
    { name: 'Node.js', label: 'NJS' },
    { name: 'React', label: 'RCT' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50/40">
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="max-w-4xl mx-auto">
          {/* Logo */}
          <motion.div 
            className="w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-12 sm:mb-16"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <LogoMarkV />
          </motion.div>

          <div className="mb-10 -mt-10 flex justify-center">
            <div className="font-['Inter:Light',sans-serif] font-light text-[160px] leading-none text-black">
              Glacia
            </div>
          </div>

          {/* Hero Content */}
          <motion.div 
            className="text-center mb-16 sm:mb-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h1 className="mb-6 sm:mb-8 bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent leading-tight">
              Store Your Memories Forever,<br />On Your Terms
            </h1>
            <div className="mb-8 flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <span className="font-['Dancing_Script',cursive] text-3xl text-[#4d4d4d]">
                  Check the demo
                </span>
                <motion.span
                  className="flex items-center gap-1 text-blue-700"
                  animate={{ scaleX: [0.7, 1, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ transformOrigin: 'left center' }}
                >
                  <span className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 via-blue-500 to-transparent" />
                  <span className="text-2xl">➜</span>
                </motion.span>
                <Button
                  onClick={handleLogin}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Demo
                </Button>
              </div>
            </div>

            <p className="text-gray-600 max-w-2xl mx-auto mb-6 leading-relaxed">
              Glacia empowers you to preserve your precious memories with long-term storage solutions that don't break the bank. 
              Install on your own infrastructure with plug-and-play simplicity.
            </p>

            {/* Waitlist Form */}
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Join Waitlist
                  </Button>
                </div>
              </form>
            ) : (
              <motion.div 
                className="max-w-md mx-auto mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 justify-center text-green-700"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
              >
                <IconPlaceholder label="OK" className="size-5 border-green-200 text-green-700 bg-green-50" />
                <span>You're on the list! We'll be in touch soon.</span>
              </motion.div>
            )}
            <p className="text-gray-500 text-sm">
              Join thousands waiting for early access
            </p>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.h2 
              className="text-center mb-12 sm:mb-16 text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Why Choose Glacia?
            </motion.h2>
            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <Card className="p-6 lg:p-8 hover:shadow-lg transition-shadow h-full">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-blue-600 text-white shrink-0">
                        <IconPlaceholder label={feature.iconLabel} className="size-6 text-white border-white/40 bg-transparent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-3 text-gray-900 leading-tight">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* UI Showcase Section */}
      <div className="py-16 sm:py-20 lg:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.h2 
              className="text-center mb-6 sm:mb-8 text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Beautiful Interface, Powerful Features
            </motion.h2>
            <motion.p 
              className="text-center text-gray-600 mb-12 sm:mb-16 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Experience a seamless interface designed for both mobile and desktop. 
              Manage your memories with ease, wherever you are.
            </motion.p>
            
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Mobile Preview */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="order-2 lg:order-1"
              >
                <Card className="p-6 lg:p-8 bg-white">
                  <h3 className="mb-4 text-gray-900">Mobile First</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Access your memories on the go with our responsive mobile interface. 
                    Upload, organize, and share with just a tap.
                  </p>
                  <div className="rounded-lg overflow-hidden shadow-xl">
                    <ImageWithFallback 
                      src="https://images.unsplash.com/photo-1605108222700-0d605d9ebafe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2JpbGUlMjBhcHAlMjBpbnRlcmZhY2V8ZW58MXx8fHwxNzYyODIxNDM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Mobile interface preview"
                      className="w-full h-auto"
                    />
                  </div>
                </Card>
              </motion.div>

              {/* Desktop Preview */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="order-1 lg:order-2"
              >
                <Card className="p-6 lg:p-8 bg-white">
                  <h3 className="mb-4 text-gray-900">Desktop Power</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Take advantage of the full desktop experience with advanced features, 
                    batch uploads, and comprehensive management tools.
                  </p>
                  <div className="rounded-lg overflow-hidden shadow-xl">
                    <ImageWithFallback 
                      src="https://images.unsplash.com/photo-1575388902449-6bca946ad549?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNrdG9wJTIwZGFzaGJvYXJkJTIwaW50ZXJmYWNlfGVufDF8fHx8MTc2Mjg5ODkwMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Desktop interface preview"
                      className="w-full h-auto"
                    />
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Technologies Section */}
      <div className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.h2 
              className="text-center mb-6 sm:mb-8 text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Built with Industry-Leading Technologies
            </motion.h2>
            <motion.p 
              className="text-center text-gray-600 mb-12 sm:mb-16 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Glacia is powered by modern, battle-tested technologies to ensure 
              reliability, performance, and scalability.
            </motion.p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
              {technologies.map((tech, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center gap-4 p-6 rounded-lg hover:bg-gray-50 transition-colors"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-blue-600">
                    <IconPlaceholder label={tech.label} className="size-8 border-blue-200 text-blue-600 bg-white" />
                  </div>
                  <span className="text-gray-900">{tech.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 sm:py-20 lg:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.h2 
              className="text-center mb-12 sm:mb-16 text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Simple Setup, Powerful Results
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {[
                { step: '01', title: 'Install', description: 'Deploy Glacia on your infrastructure with our one-click installer' },
                { step: '02', title: 'Configure', description: 'Customize your storage preferences and retention policies' },
                { step: '03', title: 'Upload', description: 'Start preserving your memories with complete control and transparency' }
              ].map((item, index) => (
                <motion.div 
                  key={index} 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                >
                  <div className="inline-block mb-6 px-5 py-2 rounded-full bg-blue-600 text-white">
                    {item.step}
                  </div>
                  <h3 className="mb-3 text-gray-900 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <motion.div 
        className="bg-blue-600 py-16 sm:py-20 lg:py-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="mb-6 text-white leading-tight">
            Ready to Take Control?
          </h2>
          <p className="text-white/90 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
            Be among the first to experience a new way of storing your memories. 
            Join our waitlist today.
          </p>
          {!isSubmitted && (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-white"
                />
                <Button type="submit" variant="secondary" className="bg-white hover:bg-gray-100 text-blue-600">
                  Join Waitlist
                </Button>
              </div>
            </form>
          )}
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm leading-relaxed">
            © 2025 Glacia. Your memories, your infrastructure.
          </p>
        </div>
      </footer>
      <Toaster richColors position="top-center" />
    </div>
  );
}
