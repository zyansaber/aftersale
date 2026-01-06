import { useEffect, useMemo, useState } from "react";
import { database, get, ref, set, storage, storageRef, uploadBytes, getDownloadURL } from "@/lib/firebase";
import type { GuideCatalogue, GuideDataset, GuideFile, GuideTreeNode } from "@/types/aftercare";
import { v4 as uuid } from "uuid";

type UploadPayload = {
  file: File;
  catalogueId: string;
};

const DATA_PATH = "aftercare";

const buildTree = (dataset: GuideDataset): GuideTreeNode[] => {
  const catalogueMap = new Map<string, GuideTreeNode>();

  dataset.catalogues.forEach((cat) => {
    catalogueMap.set(cat.id, {
      ...cat,
      children: [],
      files: [],
    });
  });

  dataset.files.forEach((file) => {
    const node = catalogueMap.get(file.catalogueId);
    if (node) {
      node.files.push(file);
    }
  });

  const roots: GuideTreeNode[] = [];
  catalogueMap.forEach((node) => {
    if (node.parentId) {
      const parent = catalogueMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  const sortNode = (node: GuideTreeNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.files.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortNode);
  };

  roots.forEach(sortNode);
  roots.sort((a, b) => a.name.localeCompare(b.name));
  return roots;
};

export const useGuideLibrary = () => {
  const [dataset, setDataset] = useState<GuideDataset>({ catalogues: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const tree = useMemo(() => buildTree(dataset), [dataset]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [] as Array<{ type: "catalogue" | "file"; item: GuideCatalogue | GuideFile }>;
    }

    const query = searchQuery.trim().toLowerCase();
    const catalogueMatches = dataset.catalogues.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        (cat.description ?? "").toLowerCase().includes(query)
    );

    const fileMatches = dataset.files.filter(
      (file) =>
        file.name.toLowerCase().includes(query) ||
        file.type.toLowerCase().includes(query)
    );

    return [
      ...catalogueMatches.map((item) => ({ type: "catalogue" as const, item })),
      ...fileMatches.map((item) => ({ type: "file" as const, item })),
    ];
  }, [dataset, searchQuery]);

  const load = async () => {
    try {
      setLoading(true);
      const snap = await get(ref(database, DATA_PATH));
      if (!snap.exists()) {
        setDataset({ catalogues: [], files: [] });
        return;
      }
      const value = snap.val();
      setDataset({
        catalogues: Object.values((value.catalogues ?? {}) as Record<string, GuideCatalogue>),
        files: Object.values((value.files ?? {}) as Record<string, GuideFile>),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guide library");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const upsertCatalogue = async (payload: { name: string; description?: string; parentId?: string | null }) => {
    const id = uuid();
    const now = new Date().toISOString();
    const record: GuideCatalogue = {
      id,
      name: payload.name,
      description: payload.description,
      parentId: payload.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await set(ref(database, `${DATA_PATH}/catalogues/${id}`), record);
    await load();
    return record;
  };

  const uploadGuideFile = async ({ file, catalogueId }: UploadPayload) => {
    const id = uuid();
    const path = `aftercare/${catalogueId}/${id}-${file.name}`;
    const storageReference = storageRef(storage, path);
    await uploadBytes(storageReference, file);
    const downloadUrl = await getDownloadURL(storageReference);

    const now = new Date().toISOString();
    const record: GuideFile = {
      id,
      catalogueId,
      name: file.name,
      downloadUrl,
      storagePath: path,
      size: file.size,
      type: file.type,
      createdAt: now,
      updatedAt: now,
    };

    await set(ref(database, `${DATA_PATH}/files/${id}`), record);
    await load();
    return record;
  };

  return {
    tree,
    loading,
    error,
    dataset,
    searchQuery,
    setSearchQuery,
    searchResults,
    upsertCatalogue,
    uploadGuideFile,
    reload: load,
  };
};
