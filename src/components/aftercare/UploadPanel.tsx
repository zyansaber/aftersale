import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { FolderTree, UploadCloud } from "lucide-react";
import { GuideTreeNode } from "@/types/aftercare";

type UploadPanelProps = {
  onUpload: (payload: { file: File; catalogueId: string }) => Promise<void>;
  activeCatalogueId?: string;
  catalogues: GuideTreeNode[];
};

const buildCatalogueOptions = (nodes: GuideTreeNode[], parents: string[] = []): Array<{
  id: string;
  label: string;
}> => {
  return nodes.flatMap((node) => {
    const path = [...parents, node.name];
    const current = [{ id: node.id, label: path.join(" / ") }];
    const children = buildCatalogueOptions(node.children, path);
    return [...current, ...children];
  });
};

export const UploadPanel = ({ onUpload, activeCatalogueId, catalogues }: UploadPanelProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedCatalogueId, setSelectedCatalogueId] = useState<string | undefined>(activeCatalogueId);

  const catalogueOptions = useMemo(() => buildCatalogueOptions(catalogues), [catalogues]);

  useEffect(() => {
    if (activeCatalogueId) {
      setSelectedCatalogueId(activeCatalogueId);
    } else if (!selectedCatalogueId && catalogueOptions[0]) {
      setSelectedCatalogueId(catalogueOptions[0].id);
    }
  }, [activeCatalogueId, catalogueOptions, selectedCatalogueId]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setProgress(0);
      setUploading(false);
    }
  }, [open]);

  const handleUpload = async () => {
    if (!file || !selectedCatalogueId) {
      toast.error("Please choose a file and destination folder.");
      return;
    }
    try {
      setUploading(true);
      setProgress(25);
      await onUpload({ file, catalogueId: selectedCatalogueId });
      setProgress(100);
      toast.success("File uploaded", { description: file.name });
      setFile(null);
      setOpen(false);
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Unable to upload file",
      });
    } finally {
      setTimeout(() => setUploading(false), 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-slate-900 text-white shadow-sm hover:bg-slate-800">
          <UploadCloud className="h-4 w-4" />
          Upload guide
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FolderTree className="h-5 w-5 text-slate-600" />
            Upload aftersale guide
          </DialogTitle>
          <DialogDescription>
            Pick a destination folder and attach the guide file. Uploads are saved to Firebase Storage and indexed in Realtime Database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Destination folder</Label>
            <Select value={selectedCatalogueId} onValueChange={setSelectedCatalogueId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select where to save the file" />
              </SelectTrigger>
              <SelectContent>
                {catalogueOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Organize uploads into the correct directory before saving.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Choose a file</Label>
            <label
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-lg border border-dashed px-4 py-3 transition",
                "hover:border-slate-400 hover:bg-slate-50"
              )}
            >
              <div>
                <p className="font-medium">{file?.name ?? "Click to select a guide file"}</p>
                <p className="text-xs text-muted-foreground">PDFs, images, and common documents are supported.</p>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <UploadCloud className="h-4 w-4" />
                <span className="text-sm font-semibold">Browse</span>
              </div>
              <input
                type="file"
                className="sr-only"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setProgress(0);
                }}
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label>Upload progress</Label>
            <Progress value={uploading ? progress : 0} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Files are uploaded to cloud storage and recorded instantly.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading} className="gap-2">
            {uploading ? (
              "Uploading..."
            ) : (
              <>
                <UploadCloud className="h-4 w-4" /> Upload now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
