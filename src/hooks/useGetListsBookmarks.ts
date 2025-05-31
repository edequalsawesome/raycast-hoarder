import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { fetchGetSingleListBookmarks } from "../apis";
import { Bookmark, PossibleBookmarkResponse } from "../types";

interface ListBookmarksState {
  allBookmarks: Bookmark[];
  isInitialLoad: boolean;
  cursor?: string | null;
}

export function useGetListsBookmarks(listId: string) {
  const [state, setState] = useState<ListBookmarksState>({
    allBookmarks: [],
    isInitialLoad: true,
    cursor: undefined,
  });

  const removeDuplicates = useCallback(
    (bookmarks: Bookmark[]) => Array.from(new Map(bookmarks.map((b) => [b.id, b])).values()),
    [],
  );

  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (listId, cursorInput) => {
      const rawFetchedData = (await fetchGetSingleListBookmarks(
        listId,
        cursorInput === "initial" ? undefined : cursorInput,
      )) as PossibleBookmarkResponse;

      let bookmarks: Bookmark[] = [];
      let nextCursor: string | null = null;
      let hasMore = false;

      if (Array.isArray(rawFetchedData)) {
        // Case 1: API returns a direct array of bookmarks
        bookmarks = rawFetchedData; // Already Bookmark[] due to type guard
        // For direct arrays, pagination info from the response body is usually not available.
        nextCursor = null;
        hasMore = false; // Or determine based on array length if a page size is known.
      } else if (rawFetchedData && typeof rawFetchedData === "object") {
        // Case 2: API returns an object (ApiResponse, DataBookmarkResponse, or ItemsBookmarkResponse)
        if ("bookmarks" in rawFetchedData && Array.isArray(rawFetchedData.bookmarks)) {
          // ApiResponse<Bookmark>
          bookmarks = rawFetchedData.bookmarks;
          nextCursor = rawFetchedData.nextCursor ?? null;
        } else if ("data" in rawFetchedData && Array.isArray(rawFetchedData.data)) {
          // DataBookmarkResponse
          bookmarks = rawFetchedData.data;
          nextCursor = rawFetchedData.nextCursor ?? null; // Assuming nextCursor might be part of DataBookmarkResponse
        } else if ("items" in rawFetchedData && Array.isArray(rawFetchedData.items)) {
          // ItemsBookmarkResponse
          bookmarks = rawFetchedData.items;
          nextCursor = rawFetchedData.nextCursor ?? null; // Assuming nextCursor might be part of ItemsBookmarkResponse
        }
        // If no known key is found, bookmarks remains an empty array.

        // nextCursor is already handled above for specific response types.
        // If the object doesn't match any known structure with a cursor, nextCursor remains null.
        // Add more checks for pagination if other keys are possible e.g. responseObject.meta?.pagination?.next_cursor

        hasMore = !!nextCursor;
      }
      // If rawFetchedData is not an array or object, bookmarks will be [], nextCursor null, hasMore false.
      // Errors during fetch (like network or parsing errors from fetchWithAuth) should be caught by useCachedPromise.

      return {
        bookmarks: bookmarks,
        hasMore: hasMore,
        nextCursor: nextCursor,
      };
    },
    [listId, state.cursor],
    {
      execute: true,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    setState({
      allBookmarks: [],
      isInitialLoad: true,
      cursor: undefined,
    });
  }, [listId]);

  useEffect(() => {
    if (data?.bookmarks) {
      setState((prev) => {
        if (prev.isInitialLoad) {
          return {
            allBookmarks: removeDuplicates(data.bookmarks || []),
            isInitialLoad: false,
            cursor: data.nextCursor || null,
          };
        }

        const needsReset = shouldResetCache(data.bookmarks || [], prev.allBookmarks);
        if (needsReset) {
          return {
            allBookmarks: removeDuplicates(data.bookmarks || []),
            isInitialLoad: false,
            cursor: data.nextCursor || null,
          };
        }

        return {
          allBookmarks: removeDuplicates([...prev.allBookmarks, ...(data.bookmarks || [])]),
          isInitialLoad: false,
          cursor: data.nextCursor || null,
        };
      });
    }
  }, [data, removeDuplicates]);

  const shouldResetCache = useCallback((newBookmarks: Bookmark[], cachedBookmarks: Bookmark[]) => {
    if (cachedBookmarks.length === 0) return false;

    const newIds = new Set(newBookmarks.map((b) => b.id));
    const cachedIds = new Set(cachedBookmarks.slice(0, newBookmarks.length).map((b) => b.id));

    if (newIds.size !== cachedIds.size) return true;

    for (const id of newIds) {
      if (!cachedIds.has(id)) return true;
    }
    for (const id of cachedIds) {
      if (!newIds.has(id)) return true;
    }

    const cachedFirstPage = cachedBookmarks.slice(0, newBookmarks.length);
    return !newBookmarks.every((bookmark, index) => bookmark.id === cachedFirstPage[index]?.id);
  }, []);

  const loadNextPage = useCallback(() => {
    if (!data?.nextCursor || isLoading || !data.hasMore) return;
    setState((prev) => ({
      ...prev,
      cursor: data.nextCursor ?? undefined,
    }));
  }, [data, isLoading]);

  const refresh = useCallback(async () => {
    setState({
      allBookmarks: [],
      isInitialLoad: true,
      cursor: undefined,
    });
    await revalidate();
  }, [revalidate]);

  return {
    isLoading,
    bookmarks: state.allBookmarks,
    hasMore: data?.hasMore ?? false,
    error,
    revalidate: refresh,
    loadNextPage,
  };
}
