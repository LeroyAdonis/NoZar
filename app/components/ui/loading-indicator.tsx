import { Loader2 } from "lucide-react";

type SpinnerProps = {
  className?: string;
};

export function Spinner({ className = "w-4 h-4" }: SpinnerProps) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />;
}

type LoadingBarProps = {
  className?: string;
};

export function LoadingBar({
  className = "",
}: LoadingBarProps) {
  return (
    <div
      className={`h-1 w-full overflow-hidden rounded-full bg-white/10 ${className}`}
      role="progressbar"
      aria-label="Loading"
      aria-busy="true"
    >
      <div className="h-full w-1/3 animate-[loading-bar_1.2s_ease-in-out_infinite] rounded-full bg-emerald-500" />
    </div>
  );
}
