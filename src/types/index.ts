// Action types
export type linkMainActionType = "openInBrowser" | "viewDetail" | "edit" | "copy";
export type textMainActionType = "viewDetail" | "edit" | "copy";

// Common display preferences for internal use
interface DisplayOptions {
  displayBookmarkPreview: boolean;
  displayTags: boolean;
  displayCreatedAt: boolean;
  displayDescription: boolean;
  displayNote: boolean;
  displayBookmarkStatus: boolean;
  displaySummary: boolean;
}

// Base configuration options for internal use
interface BaseConfig {
  apiUrl: string;
  apiKey: string;
  language: string;
  showWebsitePreview: boolean;
  linkMainAction: linkMainActionType;
  textMainAction: textMainActionType;
}

export interface Preferences extends Partial<DisplayOptions> {
  apiUrl: string;
  apiKey: string;
  language?: string;
  showWebsitePreview: boolean;
  linkMainAction?: linkMainActionType;
  textMainAction?: textMainActionType;
}

export interface Config extends BaseConfig, DisplayOptions {}

// Asset types
export interface Asset {
  id: string;
  assetType: "screenshot" | "image" | "pdf" | undefined;
}

// Tag related types
type AttachmentSource = "ai" | "human";

interface TagMetrics {
  numBookmarks: number;
  numBookmarksByAttachedType: {
    ai: number;
    human: number;
  };
}

export interface Tag extends TagMetrics {
  id: string;
  name: string;
  attachedBy?: AttachmentSource;
}

// Bookmark content types
interface BaseContent {
  title?: string;
  description?: string;
}

export interface BookmarkContent extends BaseContent {
  type: "link" | "text" | "asset";
  url?: string;
  text?: string;
  assetType?: Asset["assetType"];
  assetId?: string;
  fileName?: string;
  favicon?: string;
}

export interface Bookmark {
  id: string;
  title?: string;
  content: BookmarkContent;
  summary?: string;
  note?: string;
  favourited: boolean;
  archived: boolean;
  createdAt: string;
  assets?: Asset[];
  tags: Tag[];
}

export interface List {
  id: string;
  name: string;
}

export interface ListDetails {
  bookmarks: Bookmark[];
}

// Specific bookmark response structures
export interface DataBookmarkResponse {
  data: Bookmark[];
  nextCursor?: string | null; // Optional: if pagination info is alongside data
}

export interface ItemsBookmarkResponse {
  items: Bookmark[];
  nextCursor?: string | null; // Optional: if pagination info is alongside items
}

// Defines the possible shapes of the response when fetching bookmarks.
// This helps in type-checking and handling different API response structures.
export type PossibleBookmarkResponse =
  | Bookmark[] // API might return a direct array of bookmarks.
  | ApiResponse<Bookmark> // Standard API response structure.
  | DataBookmarkResponse // Custom structure with bookmarks under a 'data' key.
  | ItemsBookmarkResponse; // Custom structure with bookmarks under an 'items' key.
export interface ApiResponse<T extends List | Tag | Bookmark = List | Tag | Bookmark> {
  lists?: T[];
  tags?: T[];
  bookmarks?: Bookmark[];
  nextCursor?: string | null;
}

export interface GetBookmarksParams {
  cursor?: string;
  favourited?: boolean;
  archived?: boolean;
}
