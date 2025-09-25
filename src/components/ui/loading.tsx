import { Loader2 } from "lucide-react";

interface LoadingProps {
	message?: string;
}

export function Loading({ message = "Loading..." }: LoadingProps) {
	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
			<Loader2 className="h-8 w-8 animate-spin text-primary" />
			<p className="text-muted-foreground">{message}</p>
		</div>
	);
}
