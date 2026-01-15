'use client';

import React, { useEffect, useRef } from 'react';

interface ParticleOrbProps {
    currentMode: 'quick' | 'smart' | 'deep';
    modeRef: React.MutableRefObject<'quick' | 'smart' | 'deep'>;
    isModeChangeActiveRef: React.MutableRefObject<boolean>;
    rotationSpeedRef: React.MutableRefObject<number>;
}

export default function ParticleOrb({
    currentMode,
    modeRef,
    isModeChangeActiveRef,
    rotationSpeedRef
}: ParticleOrbProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<any[]>([]);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: any[] = [];
        const particleCount = 1200;
        const shapeParticleCount = 450;
        const sphereRadius = 110;

        let mouse = { x: -1000, y: -1000 };

        // Shape Targets
        let shapeTargets = {
            lightning: [] as any[],
            bulb: [] as any[],
            lens: [] as any[]
        };

        const generateShapes = () => {
            const cx = 150; const cy = 150;

            // 1. LIGHTNING
            shapeTargets.lightning = [];
            for (let i = 0; i < shapeParticleCount; i++) {
                let t = i / shapeParticleCount;
                let x, y, z = (Math.random() - 0.5) * 20;
                if (t < 0.33) {
                    x = -20 + (t / 0.33) * 20;
                    y = -50 + (t / 0.33) * 30;
                } else if (t < 0.5) {
                    x = 0 - ((t - 0.33) / 0.17) * 20;
                    y = -20 + ((t - 0.33) / 0.17) * 10;
                } else {
                    x = -20 + ((t - 0.5) / 0.5) * 30;
                    y = -10 + ((t - 0.5) / 0.5) * 60;
                }
                shapeTargets.lightning.push({ x: -x + cx, y: y + cy, z: z });
            }

            // 2. BULB
            shapeTargets.bulb = [];
            for (let i = 0; i < shapeParticleCount; i++) {
                let t = i / shapeParticleCount;
                let x, y, z;
                if (t < 0.7) {
                    let angle = t * Math.PI * 10;
                    let rad = 35 * Math.sin(t * Math.PI);
                    x = Math.cos(angle) * rad;
                    y = Math.sin(angle) * rad - 15;
                    z = (Math.random() - 0.5) * 30;
                } else {
                    let t2 = (t - 0.7) / 0.3;
                    x = (Math.random() - 0.5) * 25;
                    y = 20 + t2 * 30;
                    z = (Math.random() - 0.5) * 20;
                }
                shapeTargets.bulb.push({ x: x + cx, y: y + cy, z: z });
            }

            // 3. MAGNIFYING GLASS
            shapeTargets.lens = [];
            for (let i = 0; i < shapeParticleCount; i++) {
                let t = i / shapeParticleCount;
                let x, y, z = (Math.random() - 0.5) * 10;
                if (t < 0.7) {
                    let angle = t * Math.PI * 4;
                    let rad = 35 + (Math.random() * 5);
                    x = Math.cos(angle) * rad - 10;
                    y = Math.sin(angle) * rad - 10;
                } else {
                    let t2 = (t - 0.7) / 0.3;
                    x = 20 + t2 * 40;
                    y = 20 + t2 * 40;
                }
                shapeTargets.lens.push({ x: x + cx, y: y + cy, z: z });
            }
        };

        generateShapes();

        class Particle {
            index: number;
            theta: number;
            phi: number;
            ox: number = 0; oy: number = 0; oz: number = 0;
            x: number = 0; y: number = 0; z: number = 0;
            size: number;
            isShapeParticle: boolean;

            constructor(index: number) {
                this.index = index;
                this.theta = Math.random() * Math.PI * 2;
                this.phi = Math.acos((Math.random() * 2) - 1);
                this.size = Math.random() * 1.5 + 0.5;
                this.isShapeParticle = index < shapeParticleCount;
            }

            update(rotationX: number, rotationY: number, isHovering: boolean) {
                const r = sphereRadius;
                let tx = r * Math.sin(this.phi) * Math.cos(this.theta);
                let ty = r * Math.sin(this.phi) * Math.sin(this.theta);
                let tz = r * Math.cos(this.phi);

                let x1 = tx * Math.cos(rotationY) - tz * Math.sin(rotationY);
                let z1 = tx * Math.sin(rotationY) + tz * Math.cos(rotationY);
                let y1 = ty;

                let y2 = y1 * Math.cos(rotationX) - z1 * Math.sin(rotationX);
                let z2 = y1 * Math.sin(rotationX) + z1 * Math.cos(rotationX);
                let x2 = x1;

                const centerX = 150;
                const centerY = 150;

                this.ox = x2 + centerX;
                this.oy = y2 + centerY;
                this.oz = z2;

                let targetX = this.ox;
                let targetY = this.oy;
                let targetZ = this.oz;
                let ease = isModeChangeActiveRef.current ? 0.2 : 0.1;

                if (isHovering && this.isShapeParticle) {
                    let shapeArr = [];
                    const mode = modeRef.current;
                    if (mode === 'quick') shapeArr = shapeTargets.lightning;
                    else if (mode === 'smart') shapeArr = shapeTargets.bulb;
                    else if (mode === 'deep') shapeArr = shapeTargets.lens;

                    if (shapeArr[this.index]) {
                        targetX = shapeArr[this.index].x;
                        targetY = shapeArr[this.index].y;
                        targetZ = shapeArr[this.index].z;
                        ease = isModeChangeActiveRef.current ? 0.25 : 0.08;
                    }
                } else if (isHovering && !this.isShapeParticle) {
                    let dx = this.ox - centerX;
                    let dy = this.oy - centerY;
                    targetX = this.ox + dx * 0.3;
                    targetY = this.oy + dy * 0.3;
                }

                this.x += (targetX - this.x) * ease;
                this.y += (targetY - this.y) * ease;
                this.z += (targetZ - this.z) * ease;
            }

            draw(isHovering: boolean) {
                if (!ctx) return;
                let scale = (this.z + 200) / 300;
                if (scale < 0) return;

                let alpha = (this.z + 100) / 230;
                alpha = Math.max(0.1, Math.min(1, alpha));

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * scale, 0, Math.PI * 2);

                if (isHovering && this.isShapeParticle) {
                    ctx.fillStyle = '#D8CEF0';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = 'rgba(216, 206, 240, 0.6)';
                } else {
                    ctx.fillStyle = `rgba(230, 230, 250, ${alpha})`;
                    ctx.shadowBlur = 0;
                }

                ctx.fill();
            }
        }

        // Init Particles
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(i));
        }
        particlesRef.current = particles;

        let rotationX = 0;
        let rotationY = 0;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Speed Decay
            rotationSpeedRef.current += (0.002 - rotationSpeedRef.current) * 0.05;

            // Auto rotation if not hovering
            if (mouse.x < 0) {
                rotationY += rotationSpeedRef.current;
            } else {
                // Gentle follow mouse
                let targetRotY = (mouse.x - 150) * 0.0005;
                let targetRotX = (mouse.y - 150) * 0.0005;
                rotationY += (targetRotY - rotationY) * 0.1;
                rotationX += (targetRotX - rotationX) * 0.1;
            }

            const isHovering = mouse.x > 0 || isModeChangeActiveRef.current;

            particles.forEach(p => {
                p.update(rotationX, rotationY, isHovering);
                p.draw(isHovering);
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        // Mouse handlers
        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };
        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        // Handle Resize
        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = (canvas.parentNode as HTMLElement)?.getBoundingClientRect();
            if (rect) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;
            }
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', resizeCanvas);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return (
        <div className="orb-stage">
            <canvas ref={canvasRef} width={300} height={300} />
        </div>
    );
}
