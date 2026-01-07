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

export default function AftersaleGuidesPage() {
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
    <div className="space-y-6 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Aftersale knowledge base</h2>
          <p className="text-muted-foreground">Organize aftersale guides and resources in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <UploadPanel
            onUpload={uploadGuideFile}
            activeCatalogueId={activeCatalogueId}
            catalogues={tree}
          />
          <Badge variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> Live updates
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <CatalogueTree
            tree={tree}
            activeId={activeCatalogueId}
            onSelect={setActiveCatalogueId}
            onCreate={async (payload) => {
              await upsertCatalogue(payload);
              toast.success("Directory created", { description: payload.name });
            }}
          />
        </div>

        <div className="space-y-4">
          <Card className="border border-slate-200/70 bg-white shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-xl">File list</CardTitle>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Separator />
            </CardHeader>

            <CardContent>
              {loading && <div className="p-6 text-muted-foreground">Loading...</div>}

              {!loading && searchQuery && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Search results ({searchResults.length})
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
                      <div className="text-sm text-muted-foreground">Current directory</div>
                      <h3 className="text-lg font-semibold">{activeNode?.name ?? "Not selected"}</h3>
                    </div>
                    <Badge variant="outline">Files {activeNode?.files.length ?? 0}</Badge>
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
