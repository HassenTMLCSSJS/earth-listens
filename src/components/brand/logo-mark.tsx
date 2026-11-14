export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="el-logo-globe" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#9fe3ff" />
          <stop offset=".55" stopColor="#2a78c9" />
          <stop offset="1" stopColor="#0b1020" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="8.5" fill="url(#el-logo-globe)" />
      <ellipse
        cx="16"
        cy="16"
        rx="14"
        ry="5.2"
        fill="none"
        stroke="#f2c46d"
        strokeWidth="1.4"
        transform="rotate(-18 16 16)"
      />
      <circle cx="28.6" cy="11.6" r="1.8" fill="#ffd98a" />
    </svg>
  );
}
