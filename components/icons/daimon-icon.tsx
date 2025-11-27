import { cn } from "@/lib/utils";

interface DaimonIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * DaimonIcon - A cute demon horn icon representing the AI writing companion
 *
 * Two small curved horns, simple and elegant to match the literary aesthetic.
 */
export function DaimonIcon({ className, ...props }: DaimonIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      {...props}
    >
      {/* Left horn - curved outward */}
      <path d="M7 13c0-4 1-7 2-9c-3 2-5 5-5 9" />
      {/* Right horn - curved outward */}
      <path d="M17 13c0-4-1-7-2-9c3 2 5 5 5 9" />
      {/* Small base arc connecting the horns */}
      <path d="M8 13a4 4 0 0 0 8 0" />
    </svg>
  );
}

export default DaimonIcon;
