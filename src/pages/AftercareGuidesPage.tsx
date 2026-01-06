import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/sonner";
import { GuideCard } from "@/components/aftercare/GuideCard";
import { CatalogueTree } from "@/components/aftercare/CatalogueTree";
import { UploadPanel } from "@/components/aftercare/UploadPanel";
import { GuidePreviewDialog } from "@/components/aftercare/GuidePreviewDialog";
import { useGuideLibrary } from "@/hooks/useGuideLibrary";
import { GuideFile, GuideTreeNode } from "@/types/aftercare";
import { Search, Sparkles } from "lucide-react";

export default function AftercareGuidesPage() {
  const {
    tree,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    searchResults,
    upsertCatalogue,
    uploadGuideFile,
  } = useGuideLibrary();

  const [activeCatalogueId, setActiveCatalogueId] = useState<string | undefined>(tree[0]?.id);
  const [previewFile, setPreviewFile] = useState<GuideFile | null>(null);

  useEffect(() => {
    if (!activeCatalogueId && tree[0]) {
      setActiveCatalogueId(tree[0].id);
    }
  }, [activeCatalogueId, tree]);

  const activeNode = useMemo(() => {
    const dfs = (nodes: typeof tree): GuideTreeNode | undefined => {
      for (const node of nodes) {
        if (node.id === activeCatalogueId) return node;
        const found = dfs(node.children);
        if (found) return found;
      }
      return undefined;
    };
    return dfs(tree);
  }, [activeCatalogueId, tree]);

  const handleDownload = (file: GuideFile) => {
    const link = document.createElement("a");
    link.href = file.downloadUrl;
    link.download = file.name;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
  };

  if (error) {
    return <div className="p-8 text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold">售后指导知识库</h2>
          <p className="text-muted-foreground">
            分层目录 + 实时存储 + 智能模糊搜索，打造专业的售后指导资料库。
          </p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" /> Firebase 实时驱动
        </Badge>
      </div>

      <UploadPanel onUpload={uploadGuideFile} activeCatalogueId={activeCatalogueId} />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <CatalogueTree
            tree={tree}
            activeId={activeCatalogueId}
            onSelect={setActiveCatalogueId}
            onCreate={async (payload) => {
              await upsertCatalogue(payload);
              toast.success("目录已创建", { description: payload.name });
            }}
          />
        </div>

        <div className="space-y-4">
          <Card className="border-0 bg-white shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-xl">文件列表</CardTitle>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="模糊搜索文件 / 目录"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">实时保存到 Firebase Realtime Database</Badge>
                <Badge variant="secondary">文件存储：gs://snowy-hr-report.firebasestorage.app</Badge>
                <Badge variant="secondary">模糊搜索（关键词匹配）</Badge>
              </div>
            </CardHeader>

            <CardContent>
              {loading && <div className="p-6 text-muted-foreground">加载中...</div>}

              {!loading && searchQuery && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    搜索结果（{searchResults.length}）
                  </div>
                  <ScrollArea className="h-[520px] pr-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {searchResults.map((res) =>
                        res.type === "file" ? (
                          <GuideCard
                            key={(res.item as GuideFile).id}
                            file={res.item as GuideFile}
                            onDownload={handleDownload}
                            onPreview={setPreviewFile}
                          />
                        ) : null
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {!loading && !searchQuery && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">当前目录</div>
                      <h3 className="text-lg font-semibold">{activeNode?.name ?? "未选择"}</h3>
                    </div>
                    <Badge variant="outline">文件 {activeNode?.files.length ?? 0}</Badge>
                  </div>

                  <ScrollArea className="h-[520px] pr-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {(activeNode?.files ?? []).map((file) => (
                        <GuideCard
                          key={file.id}
                          file={file}
                          onDownload={handleDownload}
                          onPreview={setPreviewFile}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <GuidePreviewDialog
        file={previewFile}
        open={Boolean(previewFile)}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />
    </div>
  );
}
