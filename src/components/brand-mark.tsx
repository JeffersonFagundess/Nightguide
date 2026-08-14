export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#FF775C" />
      <path d="M14 45V19h9l18 24V19h9v26h-9L23 21v24h-9Z" fill="#15100E" />
      <path d="M19 46c9-2 17-8 21-16" stroke="#FFFAF2" strokeWidth="4" strokeLinecap="round" />
      <circle cx="43" cy="20" r="4" fill="#FFFAF2" />
      <circle cx="43" cy="20" r="1.7" fill="#15100E" />
    </svg>
  );
}
