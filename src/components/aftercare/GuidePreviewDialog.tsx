import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { GuideFile } from "@/types/aftercare";

type GuidePreviewDialogProps = {
  file?: GuideFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const GuidePreviewDialog = ({ file, open, onOpenChange }: GuidePreviewDialogProps) => {
  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type.includes("pdf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>{file.name}</span>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={file.downloadUrl} download target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" /> Download
              </a>
            </Button>
          </DialogTitle>
          <DialogDescription>
            {new Date(file.updatedAt).toLocaleString()} · {Math.max(1, Math.round(file.size / 1024)).toLocaleString()} KB
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isImage && (
            <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg border bg-slate-50">
              <img src={file.downloadUrl} alt={file.name} className="h-full w-full object-contain" />
            </AspectRatio>
          )}

          {isPdf && (
            <iframe
              src={`${file.downloadUrl}#toolbar=0`}
              title={file.name}
              className="h-[70vh] w-full rounded-lg border"
            />
          )}

          {!isImage && !isPdf && (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border bg-slate-50 text-muted-foreground">
              <p>This file type cannot be previewed inline. Please download it directly.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
