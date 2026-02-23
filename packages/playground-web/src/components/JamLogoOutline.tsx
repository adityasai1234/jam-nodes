'use client';

import { useEffect, useState } from 'react';

interface JamLogoOutlineProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function JamLogoOutline({ className = '', size = 24, strokeWidth = 10 }: JamLogoOutlineProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains('dark'));

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // ViewBox dimensions with padding for stroke
  const viewBoxWidth = 215;
  const viewBoxHeight = 245;
  const scale = size / viewBoxWidth;

  // Stroke color based on theme
  // Dark mode: #F10606 (bright red), Light mode: #B00003 (darker red)
  const strokeColor = mounted && isDark ? '#F10606' : '#B00003';

  return (
    <svg
      width={size}
      height={viewBoxHeight * scale}
      viewBox="-7 -7 215 245"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Row 1: Top pill */}
      <rect
        x="198.154"
        y="75.8682"
        width="195.652"
        height="73.3685"
        rx="36.6842"
        transform="rotate(-180 198.154 75.8682)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Row 2 LEFT: Middle-left circle */}
      <rect
        x="100.327"
        y="154.128"
        width="97.826"
        height="78.2597"
        rx="39.1299"
        transform="rotate(-180 100.327 154.128)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Row 2 RIGHT: Middle-right half circle */}
      <path
        d="M198.154 114.998C198.154 136.609 180.635 154.128 159.025 154.128L100.328 154.128L100.328 75.8682L159.025 75.8682C180.635 75.8682 198.154 93.3872 198.154 114.998V114.998Z"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Row 3 LEFT: Bottom-left half circle */}
      <path
        d="M2.5 190.813C2.5 170.553 18.9241 154.129 39.1842 154.129H100.326V227.497H39.1843C18.9241 227.497 2.5 211.073 2.5 190.813V190.813Z"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Row 3 RIGHT: Bottom-right half circle */}
      <path
        d="M198.154 190.812C198.154 211.072 181.73 227.496 161.47 227.496L100.328 227.496L100.328 154.128L161.47 154.128C181.73 154.128 198.154 170.552 198.154 190.812V190.812Z"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
