import React, { useEffect, useRef } from 'react';

export function AnimatedBrandPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');  
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Particle system
    class Particle {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      radius: number;
      angle: number;
      distance: number;
      speed: number;
      opacity: number;

      constructor(centerX: number, centerY: number, index: number, total: number) {
        this.angle = (index / total) * Math.PI * 2;
        this.distance = 80 + Math.random() * 120;
        this.baseX = centerX;
        this.baseY = centerY;
        this.x = centerX + Math.cos(this.angle) * this.distance;
        this.y = centerY + Math.sin(this.angle) * this.distance;
        this.radius = 1 + Math.random() * 2;
        this.speed = 0.0005 + Math.random() * 0.001;
        this.opacity = 0.3 + Math.random() * 0.7;
      }

      update(rotation: number) {
        const currentAngle = this.angle + rotation;
        this.x = this.baseX + Math.cos(currentAngle) * this.distance;
        this.y = this.baseY + Math.sin(currentAngle) * this.distance;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${this.opacity})`;
        ctx.fill();
      }
    }

    // Initialize particles
    const initParticles = () => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const particleCount = 60;

      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(new Particle(centerX, centerY, i, particleCount));
      }
    };

    initParticles();

    // Animation loop
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Update rotation (slow, continuous)
      rotationRef.current += 0.002;

      // Draw connecting lines between nearby particles
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p1 = particlesRef.current[i];
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            const opacity = (1 - distance / 100) * 0.2;
            ctx.strokeStyle = `rgba(168, 85, 247, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        particle.update(rotationRef.current);
        particle.draw(ctx);
      });

      // Draw central glow
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 150);
      gradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
      gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.1)');
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw core sphere
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40);
      coreGradient.addColorStop(0, 'rgba(196, 181, 253, 0.8)');
      coreGradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.6)');
      coreGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // Draw rotating ring
      const ringRotation = rotationRef.current * 2;
      ctx.strokeStyle = 'rgba(196, 181, 253, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        60,
        20,
        ringRotation,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%)',
      }}
    >
      {/* Animated gradient orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, transparent 70%)',
          animationDuration: '6s',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)',
          animationDuration: '8s',
          animationDelay: '2s',
        }}
      />

      {/* Canvas for neural sphere */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Brand content */}
      <div className="relative z-10 text-center px-8">
        {/* Pure visual experience - no text */}
      </div>

      {/* Bottom decorative elements */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 opacity-50 animate-in fade-in duration-1000 delay-700">
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDuration: '2s' }} />
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.6s' }} />
      </div>
    </div>
  );
}