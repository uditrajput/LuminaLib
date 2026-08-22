"use client";

import React, { useEffect, useRef } from "react";

export default function Canvas3DParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.getContext !== "function") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;


    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Create 3D particle points
    const particleCount = 70;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * height * 1.5,
      z: Math.random() * 800 + 100,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      vz: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? "rgba(99, 102, 241, " : "rgba(59, 130, 246, ",
    }));

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - width / 2) * 0.05;
      mouseY = (e.clientY - height / 2) * 0.05;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const fov = 400;
      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.x += p.vx + mouseX * 0.01;
        p.y += p.vy + mouseY * 0.01;
        p.z += p.vz;

        if (p.z <= 0) p.z = 900;
        if (p.z > 900) p.z = 10;
        if (p.x < -width) p.x = width;
        if (p.x > width) p.x = -width;
        if (p.y < -height) p.y = height;
        if (p.y > height) p.y = -height;

        const scale = fov / (fov + p.z);
        const x2d = p.x * scale + cx;
        const y2d = p.y * scale + cy;
        const r = p.size * scale * 2.5;
        const alpha = Math.min(1, (1 - p.z / 900) * 0.85);

        if (x2d >= 0 && x2d <= width && y2d >= 0 && y2d <= height) {
          ctx.beginPath();
          ctx.arc(x2d, y2d, Math.max(0.5, r), 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${alpha})`;
          ctx.shadowBlur = 12 * scale;
          ctx.shadowColor = p.color + "0.8)";
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Draw subtle connecting 3D lines between nearby particles
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dz = p.z - p2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 180) {
            const scale2 = fov / (fov + p2.z);
            const x2d2 = p2.x * scale2 + cx;
            const y2d2 = p2.y * scale2 + cy;
            const lineAlpha = (1 - dist / 180) * 0.15 * alpha;

            ctx.beginPath();
            ctx.moveTo(x2d, y2d);
            ctx.lineTo(x2d2, y2d2);
            ctx.strokeStyle = `rgba(139, 92, 246, ${lineAlpha})`;
            ctx.lineWidth = 0.8 * scale;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}
