export type GuideCatalogue = {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type GuideFile = {
  id: string;
  catalogueId: string;
  name: string;
  downloadUrl: string;
  storagePath: string;
  size: number;
  type: string;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type GuideTreeNode = GuideCatalogue & {
  children: GuideTreeNode[];
  files: GuideFile[];
};

export type GuideDataset = {
  catalogues: GuideCatalogue[];
  files: GuideFile[];
};
