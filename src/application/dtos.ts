export interface PresignedUrlResponse {
  fileId: string;
  presignedUrl: string;
  fields?: Record<string, string>;
  expiresIn: number;
}

export interface FileResponse {
  id: string;
  resourceType: string;
  resourceId: string;
  category: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  status: string;
  description: string | null;
  expiresAt: string | null;
  parentId: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileListResponse {
  files: FileResponse[];
  total: number;
}

export interface CreateFilePresignedInput {
  resourceType: string;
  resourceId: string;
  category: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
  expiresAt?: string;
  uploadedBy: string;
}

export interface ConfirmFileUploadInput {
  fileId: string;
  checksum: string;
}

export interface UpdateFileMetadataInput {
  description?: string;
  category?: string;
  expiresAt?: string | null;
}

export interface FileFilterInput {
  resourceType: string;
  resourceId: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}
