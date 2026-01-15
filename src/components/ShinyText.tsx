'use client';

import React from 'react';

interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
    delay?: number;
    color?: string;
    spread?: number; // How "spread" the shine is (e.g. gradient size)
}

const ShinyText: React.FC<ShinyTextProps> = ({
    text,
    disabled = false,
    speed = 20,
    className = '',
    delay = 0,
    color = '#b5b5b5a4',
    spread = 160,
}) => {
    const animationDuration = `${speed}s`;

    // Determine the gradient width based on "spread"
    // Larger spread = smoother/wider gradient. 
    // We can map spread roughly to background-size percentage or similar.
    // Let's assume spread is a percentage or width value.
    // A common shimmer pattern uses background-size: 200% usually.
    // If spread is '160', maybe it implies 160% background size? Or linear-gradient stops?
    // Let's interpret spread as the background-size percentage.
    // Default 200% is common. User passed 160.

    return (
        <div
            className={`text-[#b5b5b5a4] bg-clip-text inline-block ${disabled ? '' : 'animate-shiny-text'} ${className}`}
            style={{
                backgroundImage: `linear-gradient(120deg, transparent 40%, ${color} 50%, transparent 60%)`,
                backgroundSize: `${spread}% 100%`,
                WebkitBackgroundClip: 'text',
                animationDuration: animationDuration,
                animationDelay: `${delay}s`,
                color: 'rgba(255,255,255,0.4)', // Base dim color, or rely on caller text color?
                // Actually, typically shimmer text has a base color and a shine color.
                // The shine comes from background-image moving.
                // But we need the text to be visible *under* the shine if the shine is transparent?
                // Wait, background-clip: text means the background SHOWS where text is.
                // So if background is transparent, text is invisible?
                // Unless we rely on `color` for base and background for shine?
                // If background-clip is text, usually `color` must be transparent for the background to show.
                // But we can stack backgrounds or use -webkit-text-fill-color.
                // Let's assume standard implementation: 
                // Color is Transparent, Background is the Gradient (Base Color ... Shine Color ... Base Color).
            }}
        >
            {text}
        </div>
    );
};

export default ShinyText;

// Note: Ensure @keyframes shiny-text is defined in global css or tailwind config.
// I will verify globals.css has the animation.
