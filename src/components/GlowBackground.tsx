import React, { useEffect, useRef } from 'react';

export const GlowBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;

      constructor(w: number, h: number, isMobile: boolean) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        // Moderate speeds for fluid motion
        this.vx = (Math.random() - 0.5) * (isMobile ? 0.3 : 0.6);
        this.vy = (Math.random() - 0.5) * (isMobile ? 0.3 : 0.6);
        this.radius = Math.random() * (isMobile ? 1.5 : 2.5) + 0.5;
        
        // Purple, cyan, indigo glowing shades matching Immersive UI
        const colors = [
          'rgba(6, 182, 212, 0.45)',  // Cyan
          'rgba(99, 102, 241, 0.4)',   // Indigo
          'rgba(168, 85, 247, 0.35)',  // Purple
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update(w: number, h: number) {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce from boundaries
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
      }

      draw(context: CanvasRenderingContext2D) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fillStyle = this.color;
        context.shadowBlur = this.radius * 3;
        context.shadowColor = this.color;
        context.fill();
        context.shadowBlur = 0; // reset for performance
      }
    }

    const isMobileDevice = window.innerWidth < 768;
    const maxParticles = isMobileDevice ? 30 : 80;
    const connectionDistance = isMobileDevice ? 80 : 130;
    const particles: Particle[] = [];

    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle(width, height, isMobileDevice));
    }

    // Capture mouse/touch coordinate for slight pulling force
    const pointer = { x: -1000, y: -1000, radius: 150 };

    const handlePointerMove = (e: MouseEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        pointer.x = e.touches[0].clientX;
        pointer.y = e.touches[0].clientY;
      }
    };

    const handlePointerLeave = () => {
      pointer.x = -1000;
      pointer.y = -1000;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handlePointerLeave);

    const resizeHandler = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeHandler);

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw beautiful ambient background radial glow matching #08080A
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#0d0d14'); // deep dark indigo/cyan hint
      bgGrad.addColorStop(1, '#08080A'); // deep cosmic dark Immersive UI baseline
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      particles.forEach((p) => {
        p.update(width, height);

        // Interactive gravity pull to pointer
        if (pointer.x > 0) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < pointer.radius) {
            const force = (pointer.radius - dist) / pointer.radius;
            p.x += (dx / dist) * force * 0.5;
            p.y += (dy / dist) * force * 0.5;
          }
        }

        p.draw(ctx);
      });

      // Draw connection lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.15;
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerLeave);
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10 block pointer-events-none" />;
};
