import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export function MappingSkeleton() {
	return (
		<div className="grid grid-cols-[300px_120px_1fr_100px] gap-4 rounded-lg border p-4 mb-4 items-start">
			{/* Source Resource - Column 1 (Fixed 300px) */}
			<div className="flex items-start gap-3 min-w-0">
				<Skeleton className="h-6 w-6 flex-shrink-0 mt-0.5" />
				<div className="min-w-0 flex-1 space-y-3">
					<Skeleton className="h-4 w-full max-w-[200px]" />
					<div className="space-y-1">
						<Skeleton className="h-5 w-16" />
						<Skeleton className="h-5 w-12" />
					</div>
				</div>
			</div>

			{/* Mapping Direction - Column 2 (Fixed 120px) */}
			<div className="flex flex-col items-center justify-start gap-2 py-2">
				<ArrowRight className="h-5 w-5 text-muted-foreground" />
				<Skeleton className="h-5 w-20" />
				<Skeleton className="h-5 w-16" />
			</div>

			{/* Target Resources - Column 3 (Flexible) */}
			<div className="min-w-0 space-y-3">
				{/* Status badges */}
				<div className="flex items-center gap-2">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-5 w-16" />
				</div>
				{/* Target resource items */}
				<div className="space-y-3">
					<div className="flex items-start gap-2 py-1">
						<Skeleton className="h-5 w-5 flex-shrink-0 mt-0.5" />
						<div className="min-w-0 flex-1 space-y-2">
							<Skeleton className="h-4 w-full max-w-[160px]" />
							<div className="space-y-1">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-4 w-12" />
							</div>
						</div>
					</div>
					<div className="flex items-start gap-2 py-1">
						<Skeleton className="h-5 w-5 flex-shrink-0 mt-0.5" />
						<div className="min-w-0 flex-1 space-y-2">
							<Skeleton className="h-4 w-full max-w-[140px]" />
							<div className="space-y-1">
								<Skeleton className="h-4 w-14" />
								<Skeleton className="h-4 w-10" />
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Action Buttons - Column 4 (Fixed 100px) */}
			<div className="flex flex-col gap-2 items-end pt-1">
				<Skeleton className="h-8 w-8" />
				<Skeleton className="h-8 w-8" />
				<Skeleton className="h-8 w-8" />
			</div>
		</div>
	);
}

export function MappingListSkeleton({ count = 5 }: { count?: number }) {
	return (
		<div className="space-y-4">
			{Array.from({ length: count }).map((_, i) => (
				<MappingSkeleton key={i} />
			))}
		</div>
	);
}