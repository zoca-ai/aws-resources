"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { MigrationMapping } from "@/lib/types/mapping";

export function useMappingOperations() {
  const [editingMapping, setEditingMapping] = useState<MigrationMapping | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>("");

  const utils = api.useUtils();

  const updateMapping = api.migration.updateMapping.useMutation({
    onMutate: async () => {
      toast.loading("Updating mapping...", { id: "update-mapping" });
    },
    onError: (error) => {
      toast.error(`Failed to update mapping: ${error.message}`, {
        id: "update-mapping",
      });
    },
    onSuccess: () => {
      toast.success("Mapping updated successfully", { id: "update-mapping" });
      utils.migration.mappingsInfinite.invalidate();
      setEditingMapping(null);
      setEditingNotes("");
    },
  });

  const deleteMapping = api.migration.deleteMapping.useMutation({
    onMutate: async () => {
      toast.loading("Deleting mapping...", { id: "delete-mapping" });
    },
    onError: (error) => {
      toast.error(`Failed to delete mapping: ${error.message}`, {
        id: "delete-mapping",
      });
    },
    onSuccess: () => {
      toast.success("Mapping deleted successfully", { id: "delete-mapping" });
      utils.migration.mappingsInfinite.invalidate();
    },
  });

  const handleDeleteMapping = async (mappingId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this mapping? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteMapping.mutateAsync({ id: mappingId });
    } catch (error) {
      console.error("Failed to delete mapping:", error);
    }
  };

  const handleEditNotes = (mapping: MigrationMapping) => {
    setEditingMapping(mapping);
    setEditingNotes(mapping.notes || "");
  };

  const handleSaveNotes = async () => {
    if (!editingMapping) return;

    try {
      await updateMapping.mutateAsync({
        id: editingMapping.id,
        notes: editingNotes,
      });
    } catch (error) {
      console.error("Failed to update mapping notes:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingMapping(null);
    setEditingNotes("");
  };

  const handleUpdateStatus = async (mappingId: number, newStatus: string) => {
    try {
      await updateMapping.mutateAsync({
        id: mappingId,
        migrationStatus: newStatus as any,
      });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  return {
    // State
    editingMapping,
    editingNotes,
    setEditingNotes,

    // Mutations
    updateMapping,
    deleteMapping,

    // Handlers
    handleDeleteMapping,
    handleEditNotes,
    handleSaveNotes,
    handleCancelEdit,
    handleUpdateStatus,
  };
}