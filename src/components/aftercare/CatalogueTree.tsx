import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { GuideTreeNode } from "@/types/aftercare";
import { cn } from "@/lib/utils";
import { ChevronRight, FolderPlus, Plus } from "lucide-react";
import { useState } from "react";

type CatalogueTreeProps = {
  tree: GuideTreeNode[];
  activeId?: string;
  onSelect: (id: string) => void;
  onCreate: (payload: { name: string; description?: string; parentId?: string | null }) => Promise<void>;
};

export const CatalogueTree = ({ tree, activeId, onSelect, onCreate }: CatalogueTreeProps) => {
  const [openSheet, setOpenSheet] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", parentId: "" });
  const [submitting, setSubmitting] = useState(false);

  const renderNode = (node: GuideTreeNode, depth = 0) => (
    <div key={node.id} className="space-y-2">
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-slate-100",
          activeId === node.id && "bg-slate-900 text-white hover:bg-slate-900"
        )}
        onClick={() => onSelect(node.id)}
      >
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight">{node.name}</div>
          {node.description && (
            <div className="text-xs text-muted-foreground line-clamp-1">{node.description}</div>
          )}
        </div>
        <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-600">{node.files.length}</span>
      </button>
      {node.children.length > 0 && (
        <div className="ml-4 border-l border-dashed border-slate-200 pl-4 space-y-2">
          {node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setSubmitting(true);
      await onCreate({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        parentId: form.parentId || null,
      });
      setForm({ name: "", description: "", parentId: "" });
      setOpenSheet(false);
    } finally {
      setSubmitting(false);
    }
  };

  const catalogueOptions = tree.flatMap((node) => [node, ...node.children]);

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Knowledge catalog</h3>
            <p className="text-xs text-muted-foreground">Build a hierarchical structure for aftercare guides.</p>
          </div>
          <Sheet open={openSheet} onOpenChange={setOpenSheet}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-2">
                <FolderPlus className="h-4 w-4" /> New directory
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[380px]">
              <SheetHeader>
                <SheetTitle>Create directory</SheetTitle>
                <SheetDescription>Create a new category or subcategory for aftercare files.</SheetDescription>
              </SheetHeader>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="catalogue-name">Directory name</Label>
                  <Input
                    id="catalogue-name"
                    placeholder="e.g. Engine maintenance/Diagnostic guide"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalogue-desc">Directory description</Label>
                  <Input
                    id="catalogue-desc"
                    placeholder="Briefly describe the directory purpose"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalogue-parent">Parent directory (optional)</Label>
                  <select
                    id="catalogue-parent"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={form.parentId}
                    onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                  >
                    <option value="">None (top-level)</option>
                    {catalogueOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating..." : "Create directory"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        <Separator />

        <ScrollArea className="h-[520px] pr-4">
          <div className="space-y-2">
            {tree.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                <Plus className="h-6 w-6" />
                <p className="mt-2 text-sm">No directories yet—click the top right to create one.</p>
              </div>
            )}
            {tree.map((node) => renderNode(node))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
