import React, { useRef, useState, useEffect } from 'react';

interface ThreeDCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // e.g. 'rgba(6,182,212,0.25)'
}

export const ThreeDCard: React.FC<ThreeDCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(6, 182, 212, 0.25)'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Mouse position relative to card
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to percentage
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    setGlowPos({ x: xPercent, y: yPercent });

    // Calculate rotation (-15deg to 15deg)
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 12;
    const rotateX = -((y - rect.height / 2) / (rect.height / 2)) * 12;

    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${isHovered ? 1.02 : 1})`,
        transition: isHovered ? 'transform 0.05s ease-out' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
      className={`relative rounded-2xl bg-[#09090D]/80 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden group ${className}`}
    >
      {/* Dynamic Glow Spotlight Overlay */}
      <div
        style={{
          background: `radial-gradient(circle 180px at ${glowPos.x}% ${glowPos.y}%, ${glowColor}, transparent 70%)`,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
        className="absolute inset-0 pointer-events-none z-0"
      />
      
      {/* Decorative neon corner highlights */}
      <div className="absolute top-0 left-0 w-8 h-[1px] bg-gradient-to-r from-cyan-500 to-transparent pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-0 left-0 w-[1px] h-8 bg-gradient-to-b from-cyan-500 to-transparent pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
