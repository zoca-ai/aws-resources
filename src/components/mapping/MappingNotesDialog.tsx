"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from "lucide-react";
import type { MigrationMapping } from "@/lib/types/mapping";

interface MappingNotesDialogProps {
  editingMapping: MigrationMapping | null;
  editingNotes: string;
  setEditingNotes: (notes: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isUpdating: boolean;
}

export function MappingNotesDialog({
  editingMapping,
  editingNotes,
  setEditingNotes,
  onSave,
  onCancel,
  isUpdating,
}: MappingNotesDialogProps) {
  return (
    <Dialog open={!!editingMapping} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Mapping Notes</DialogTitle>
          <DialogDescription>
            Add or edit notes for this mapping between{" "}
            {editingMapping?.sourceResourceName || editingMapping?.sourceResourceId}{" "}
            and its targets.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="font-medium text-sm">Notes</label>
            <Textarea
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              placeholder="Add any notes about this mapping..."
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
            <div className="text-muted-foreground text-xs">
              {editingNotes.length}/1000 characters
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isUpdating}>
            <Save className="mr-2 h-4 w-4" />
            Save Notes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}