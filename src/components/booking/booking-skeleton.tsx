import { Skeleton } from "@/components/ui/skeleton";

export function BookingSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Загрузка календаря">
      <Skeleton className="h-10 w-full max-w-xs" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
