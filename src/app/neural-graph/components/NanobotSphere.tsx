'use client';

import React, { useEffect, useRef } from 'react';

interface NanobotSphereProps {
    className?: string;
}

export default function NanobotSphere({ className }: NanobotSphereProps) {
    const nanobotRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = nanobotRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const particleCount = 1000;
        const sphereRadius = 60;
        let rotationAngle = 0;
        const particles = Array.from({ length: particleCount }, () => ({
            theta: Math.random() * 2 * Math.PI,
            phi: Math.acos((Math.random() * 2) - 1)
        }));

        let animationId: number;
        const animate = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0) {
                animationId = requestAnimationFrame(animate);
                return;
            }
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            rotationAngle += 0.004;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            particles.forEach(p => {
                const rotatedTheta = p.theta + rotationAngle;
                const x = sphereRadius * Math.sin(p.phi) * Math.cos(rotatedTheta);
                const y = sphereRadius * Math.cos(p.phi);
                const z = sphereRadius * Math.sin(p.phi) * Math.sin(rotatedTheta);
                const perspective = 300 / (300 - z);
                const alpha = Math.max(0.05, Math.min(1, (z + sphereRadius) / (2 * sphereRadius)));
                const projX = centerX + x * perspective;
                const projY = centerY + y * perspective;

                ctx.beginPath();
                ctx.arc(projX, projY, 1.2 * perspective, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fill();
            });

            animationId = requestAnimationFrame(animate);
        };
        animate();

        return () => cancelAnimationFrame(animationId);
    }, []);

    return (
        <canvas ref={nanobotRef} id="nanobot-canvas" className={className || "w-full h-full object-cover opacity-90"}></canvas>
    );
}
