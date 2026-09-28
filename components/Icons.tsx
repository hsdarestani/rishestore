import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

export function SearchIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></IconBase>;
}
export function UserIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.8-4 3.2-6 7.2-6s6.4 2 7.2 6"/></IconBase>;
}
export function CartIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3 4h2l1.8 9.2a2 2 0 0 0 2 1.6h6.8a2 2 0 0 0 1.9-1.3L20 7H6"/><circle cx="9" cy="19" r="1"/><circle cx="17" cy="19" r="1"/></IconBase>;
}
export function MenuIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16M4 12h16M4 17h16"/></IconBase>;
}
export function CloseIcon(props: IconProps) {
  return <IconBase {...props}><path d="m6 6 12 12M18 6 6 18"/></IconBase>;
}
export function HomeIcon(props: IconProps) {
  return <IconBase {...props}><path d="m3 11 9-7 9 7"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"/></IconBase>;
}
export function GridIcon(props: IconProps) {
  return <IconBase {...props}><rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/></IconBase>;
}
export function BookIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21.5z"/></IconBase>;
}
export function InfoIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></IconBase>;
}
export function PhoneIcon(props: IconProps) {
  return <IconBase {...props}><path d="M7 3.5 4.8 5.8c-.7.7-.8 1.8-.3 2.7 2.4 4.7 6.2 8.5 10.9 10.9.9.5 2 .4 2.7-.3l2.3-2.2-4-4-2 1.5a2 2 0 0 1-2.3 0 13.5 13.5 0 0 1-2.6-2.6 2 2 0 0 1 0-2.3L11 7.5z"/></IconBase>;
}
export function TagIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3.5 12.5 12 4h7v7l-8.5 8.5z"/><circle cx="16" cy="7.5" r="1"/></IconBase>;
}
export function ScaleIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 4v16M7 7h10M5 20h14"/><path d="m7 7-3 6h6zM17 7l-3 6h6z"/></IconBase>;
}
export function BoxIcon(props: IconProps) {
  return <IconBase {...props}><path d="m4 7 8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></IconBase>;
}
export function ShieldIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6z"/><path d="m9 12 2 2 4-4"/></IconBase>;
}
export function TruckIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></IconBase>;
}
export function ArrowLeftIcon(props: IconProps) {
  return <IconBase {...props}><path d="M19 12H5m6-6-6 6 6 6"/></IconBase>;
}
export function SparklesIcon(props: IconProps) {
  return <IconBase {...props}><path d="m12 3 1.1 3.1L16 7.2l-2.9 1.1L12 11.5l-1.1-3.2L8 7.2l2.9-1.1zM18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8zM6 13l.8 2.2L9 16l-2.2.8L6 19l-.8-2.2L3 16l2.2-.8z"/></IconBase>;
}
