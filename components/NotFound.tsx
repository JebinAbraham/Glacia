import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from './ui/button';
import LogoMarkV from '../imports/LogoMarkV1';
import { ArrowLeft, Compass } from 'lucide-react';

interface NotFoundProps {
  onBackHome: () => void;
}

export function NotFound({ onBackHome }: NotFoundProps) {
  const [glowState, setGlowState] = useState({ x: 50, y: 50, visible: false });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setGlowState({ x, y, visible: true });
  };

  const handleMouseLeave = () => {
    setGlowState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/80 to-blue-100/60 px-4 py-12 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/30 p-8 sm:p-12 shadow-[0_30px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute rounded-full bg-blue-500 blur-3xl transition-opacity duration-300 ease-out"
              style={{
                width: '20%',
                height: '20%',
                left: `${glowState.x}%`,
                top: `${glowState.y}%`,
                transform: 'translate(-50%, -50%)',
                opacity: glowState.visible ? 0.3 : 0,
              }}
            />
          </div>
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-white/40 bg-white/40 backdrop-blur">
              <LogoMarkV />
            </div>
            <p className="flex items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-blue-700 backdrop-blur">
              <Compass className="size-4" />
              Lost in transit
            </p>
            <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
              404 — This route is beyond our glacier
            </h1>
            <p className="max-w-2xl text-base text-slate-600">
              The page you’re looking for has drifted into deep freeze. Let’s guide you back to the Glacia home base where the story continues.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="ghost"
                className="border border-white/60 bg-white/50 text-slate-700 backdrop-blur"
                onClick={onBackHome}
              >
                <ArrowLeft className="mr-2 size-4" />
                Back to Home
              </Button>
              <Button
                onClick={onBackHome}
                className="bg-blue-600 text-white shadow-[0_15px_35px_rgba(37,99,235,0.25)] hover:bg-blue-700"
              >
                Explore Glacia
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
