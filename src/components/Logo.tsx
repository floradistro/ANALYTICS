export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Minimalist Cannabis Leaf */}
      {/* Center stem */}
      <line x1="50" y1="15" x2="50" y2="85" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>

      {/* Left leaves - top */}
      <path d="M 50 30 Q 30 25, 22 38 Q 20 48, 30 52 Q 40 54, 50 48" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

      {/* Right leaves - top */}
      <path d="M 50 30 Q 70 25, 78 38 Q 80 48, 70 52 Q 60 54, 50 48" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

      {/* Left leaves - middle (larger) */}
      <path d="M 50 48 Q 25 45, 15 58 Q 12 68, 25 72 Q 37 74, 50 66" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

      {/* Right leaves - middle (larger) */}
      <path d="M 50 48 Q 75 45, 85 58 Q 88 68, 75 72 Q 63 74, 50 66" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

      {/* Left leaves - bottom */}
      <path d="M 50 66 Q 32 64, 25 73 Q 24 80, 33 82 Q 42 82, 50 78" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

      {/* Right leaves - bottom */}
      <path d="M 50 66 Q 68 64, 75 73 Q 76 80, 67 82 Q 58 82, 50 78" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
