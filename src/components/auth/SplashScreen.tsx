import React, { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle class
    class Particle {
      x: number;
      y: number;
      z: number;
      px: number;
      py: number;
      vx: number;
      vy: number;
      vz: number;

      constructor() {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const radius = 150 + Math.random() * 50;

        this.x = radius * Math.sin(phi) * Math.cos(theta);
        this.y = radius * Math.sin(phi) * Math.sin(theta);
        this.z = radius * Math.cos(phi);

        this.px = 0;
        this.py = 0;

        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.vz = (Math.random() - 0.5) * 0.3;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        const distance = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
        const targetRadius = 170;

        if (distance > targetRadius) {
          this.x *= 0.98;
          this.y *= 0.98;
          this.z *= 0.98;
        }
      }

      project(centerX: number, centerY: number, rotation: number) {
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);

        const rotatedX = this.x * cosR - this.z * sinR;
        const rotatedZ = this.x * sinR + this.z * cosR;

        const scale = 300 / (300 + rotatedZ);
        this.px = centerX + rotatedX * scale;
        this.py = centerY + this.y * scale;

        return scale;
      }
    }

    // Create particles
    const particles: Particle[] = [];
    for (let i = 0; i < 200; i++) {
      particles.push(new Particle());
    }

    let rotation = 0;
    let animationFrame: number;

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      rotation += 0.003;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Update and sort particles by depth
      particles.forEach((p) => p.update());
      particles.sort((a, b) => {
        const aZ = a.x * Math.sin(rotation) + a.z * Math.cos(rotation);
        const bZ = b.x * Math.sin(rotation) + b.z * Math.cos(rotation);
        return aZ - bZ;
      });

      // Draw connections
      particles.forEach((p, i) => {
        const scale = p.project(centerX, centerY, rotation);

        particles.slice(i + 1, i + 4).forEach((other) => {
          const otherScale = other.project(centerX, centerY, rotation);
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const dz = p.z - other.z;
          const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);

          if (distance < 80) {
            const opacity = (1 - distance / 80) * Math.min(scale, otherScale) * 0.3;
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(other.px, other.py);
            ctx.stroke();
          }
        });
      });

      // Draw particles
      particles.forEach((p) => {
        const scale = p.project(centerX, centerY, rotation);
        const size = 1.5 * scale;
        const opacity = Math.min(scale * 0.8, 1);

        const gradient = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, size * 2);
        gradient.addColorStop(0, `rgba(168, 85, 247, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(139, 92, 246, ${opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(99, 102, 241, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.px, p.py, size * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    // Auto-complete after 2.5 seconds
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, 2500);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(circle at center, #1a0a2e 0%, #0a0a0f 50%, #000000 100%)',
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in duration-700">
        {/* Neural sphere visual - no text branding */}
        <div className="relative w-64 h-64 md:w-80 md:h-80">
          {/* Glow effect */}
          <div
            className="absolute inset-0 blur-3xl opacity-60"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, rgba(139, 92, 246, 0.3) 50%, transparent 70%)',
            }}
          />
        </div>

        {/* Loading indicator */}
        <div className="flex gap-2 animate-in fade-in duration-1000 delay-300">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: '#a78bfa',
              boxShadow: '0 0 10px rgba(167, 139, 250, 0.8)',
              animationDelay: '0ms',
            }}
          />
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: '#8b5cf6',
              boxShadow: '0 0 10px rgba(139, 92, 246, 0.8)',
              animationDelay: '150ms',
            }}
          />
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: '#7c3aed',
              boxShadow: '0 0 10px rgba(124, 58, 237, 0.8)',
              animationDelay: '300ms',
            }}
          />
        </div>
      </div>
    </div>
  );
}