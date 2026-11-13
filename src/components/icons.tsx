type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  viewBox: "0 0 24 24",
};

export const HomeIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const ListIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
);
export const ChartIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const WalletIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><rect x="2" y="6" width="20" height="14" rx="2" /><path d="M16 13h2M2 10h20M6 6V4h12v2" /></svg>
);
export const MoreIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
);
export const PlusIcon = ({ className = "size-6" }: P) => (
  <svg {...base} strokeWidth={2.4} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const ChevronLeft = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M15 18l-6-6 6-6" /></svg>
);
export const ChevronRight = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M9 18l6-6-6-6" /></svg>
);
export const CloseIcon = ({ className = "size-6" }: P) => (
  <svg {...base} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
