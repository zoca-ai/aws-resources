import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent } from "./card";

interface ErrorStateProps {
	title?: string;
	message: string;
	onRetry?: () => void;
}

export function ErrorState({
	title = "Error",
	message,
	onRetry,
}: ErrorStateProps) {
	return (
		<Card className="border-destructive/50 bg-destructive/10">
			<CardContent className="flex flex-col items-center justify-center space-y-4 py-12">
				<AlertCircle className="h-12 w-12 text-destructive" />
				<div className="space-y-2 text-center">
					<h3 className="font-semibold text-lg">{title}</h3>
					<p className="max-w-md text-muted-foreground text-sm">{message}</p>
				</div>
				{onRetry && (
					<Button onClick={onRetry} variant="outline" size="sm">
						<RefreshCw className="mr-2 h-4 w-4" />
						Try Again
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
