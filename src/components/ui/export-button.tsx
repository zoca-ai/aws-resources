"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
	variant?: "default" | "outline" | "secondary" | "ghost";
	size?: "default" | "sm" | "lg";
	className?: string;
}

export function ExportButton({
	variant = "outline",
	size = "sm",
	className,
}: ExportButtonProps) {
	const {
		data: exportData,
		refetch,
		isFetching,
	} = api.resources.exportAll.useQuery(undefined, {
		enabled: false, // Don't auto-fetch
	});

	const handleExport = async () => {
		try {
			// Trigger the export query
			const result = await refetch();

			if (result.data) {
				const dataToExport = {
					...result.data,
					metadata: {
						exportedBy: "AWS Resource Manager",
						exportedAt: result.data.exportedAt,
						version: "1.0",
						description:
							"Complete export of AWS resources and their migration mappings",
					},
				};

				// Create and download JSON file
				const jsonString = JSON.stringify(dataToExport, null, 2);
				const blob = new Blob([jsonString], { type: "application/json" });
				const url = URL.createObjectURL(blob);

				const a = document.createElement("a");
				a.href = url;
				a.download = `aws-resources-export-${new Date().toISOString().split("T")[0]}.json`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);

				toast.success(
					`Exported ${result.data.totalResources} resources and ${result.data.totalMappings || 0} mappings successfully`,
				);
			}
		} catch (error) {
			console.error("Export failed:", error);
			toast.error("Failed to export data");
		}
	};

	return (
		<Button
			variant={variant}
			size={size}
			onClick={handleExport}
			disabled={isFetching}
			className={className}
		>
			<Download className="mr-2 h-4 w-4" />
			{isFetching ? "Exporting..." : "Export JSON"}
		</Button>
	);
}
