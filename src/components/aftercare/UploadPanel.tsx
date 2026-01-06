import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";
import { UploadCloud } from "lucide-react";

type UploadPanelProps = {
  onUpload: (payload: { file: File; catalogueId: string }) => Promise<void>;
  activeCatalogueId?: string;
};

export const UploadPanel = ({ onUpload, activeCatalogueId }: UploadPanelProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    if (!file || !activeCatalogueId) {
      toast.error("请选择文件并选中一个目录");
      return;
    }
    try {
      setUploading(true);
      setProgress(25);
      await onUpload({ file, catalogueId: activeCatalogueId });
      setProgress(100);
      toast.success("文件已上传", { description: file.name });
      setFile(null);
    } catch (err) {
      toast.error("上传失败", {
        description: err instanceof Error ? err.message : "无法上传文件",
      });
    } finally {
      setTimeout(() => setUploading(false), 500);
    }
  };

  return (
    <Card className="border-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">上传售后指导文件</h3>
            <p className="text-sm text-slate-200">
              支持 PDF、图片等格式，上传后自动存储到 Firebase Storage，并记录索引到 Realtime DB。
            </p>
          </div>
          <UploadCloud className="h-8 w-8 text-white/70" />
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2">
            <Label className="text-slate-100">选择文件</Label>
            <Input
              type="file"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setProgress(0);
              }}
              className="bg-white/10 text-white placeholder:text-white/60 file:border-0 file:bg-white/20 file:text-white"
            />
            <p className="text-xs text-slate-200">
              当前目录：{activeCatalogueId ? activeCatalogueId : "未选择"}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-100">上传进度</Label>
            <Progress value={uploading ? progress : 0} className="h-2 bg-white/10" />
            <Button onClick={handleUpload} disabled={uploading} className="w-full bg-white text-slate-900">
              {uploading ? "上传中..." : "立即上传"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

