import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Folder, Maximize2 } from "lucide-react";
import { GuideFile } from "@/types/aftercare";
import { cn } from "@/lib/utils";

type GuideCardProps = {
  file: GuideFile;
  onDownload: (file: GuideFile) => void;
  onPreview: (file: GuideFile) => void;
};

export const GuideCard = ({ file, onDownload, onPreview }: GuideCardProps) => {
  const isPdf = file.type.includes("pdf");
  const isImage = file.type.startsWith("image/");

  return (
    <Card className="group border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4 space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
          {file.previewUrl ? (
            <img
              src={file.previewUrl}
              alt={file.name}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-200">
              {isPdf ? <FileText className="h-10 w-10" /> : <Folder className="h-10 w-10" />}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
            <div className="truncate text-sm font-semibold">{file.name}</div>
            <Badge variant="secondary" className="bg-white/20 backdrop-blur text-white">
              {Math.max(1, Math.round(file.size / 1024)).toLocaleString()} KB
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100", isImage && "bg-indigo-50 text-indigo-600")}></span>
            <div className="leading-tight">
              <div className="font-medium text-slate-900">{isPdf ? "Document" : isImage ? "Image" : "File"}</div>
              <div className="text-xs text-muted-foreground">{new Date(file.updatedAt).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onPreview(file)} className="hover:bg-slate-100">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => onDownload(file)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
