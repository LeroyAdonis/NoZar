"use client";
import { cn } from "~/lib/utils";

type SkeletonProps = {
  className?: string;
};

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse bg-white/10 rounded-md", className)}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton for form fields - mimics Input appearance
 */
function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className={cn("h-10 w-full", className)} />
    </div>
  );
}

/**
 * Skeleton for buttons
 */
function ButtonSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-full", className)} />;
}

/**
 * Skeleton for the entire login form
 */
export function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Logo */}
      <div className="text-center">
        <Skeleton className="w-12 h-12 mx-auto rounded-xl" />
        <Skeleton className="h-6 w-32 mx-auto mt-4" />
        <Skeleton className="h-3 w-40 mx-auto mt-1" />
      </div>
      
      {/* Error message */}
      <Skeleton className="h-8 w-full" />
      
      {/* Form */}
      <div className="space-y-4">
        <FormSkeleton />
        <FormSkeleton />
        <ButtonSkeleton />
      </div>
      
      {/* Divider */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-px flex-1" />
      </div>
      
      {/* Social login */}
      <ButtonSkeleton />
      
      {/* Register link */}
      <Skeleton className="h-4 w-40 mx-auto" />
    </div>
  );
}