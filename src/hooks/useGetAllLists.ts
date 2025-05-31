import { useCachedPromise } from "@raycast/utils";
import { fetchGetAllLists, fetchGetSingleListBookmarks } from "../apis";
import { List, ApiResponse, PossibleBookmarkResponse } from "../types"; // Removed ListDetails, Added Bookmark

interface ListWithCount extends List {
  count: number;
}

// Removed local DataBookmarkResponse, ItemsBookmarkResponse, and PossibleBookmarkResponse
// as they are now imported from ../types

export function useGetAllLists() {
  const { isLoading, data, error, revalidate } = useCachedPromise(async () => {
    const result = (await fetchGetAllLists()) as ApiResponse<List>;
    console.log("Raw result from fetchGetAllLists:", JSON.stringify(result, null, 2));
    const lists = result.lists || [];

    const listsWithCount = await Promise.all(
      lists.map(async (list: List) => {
        try {
          // Fetch bookmarks for the current list to get the count
          const bookmarkData = (await fetchGetSingleListBookmarks(list.id)) as PossibleBookmarkResponse;
          console.log(`Data for list bookmarks ${list.id} (${list.name}):`, JSON.stringify(bookmarkData, null, 2));

          let itemCount = 0;
          if (Array.isArray(bookmarkData)) {
            // Case 1: API returns a direct array of bookmarks
            itemCount = bookmarkData.length;
          } else if (bookmarkData && typeof bookmarkData === "object") {
            // Case 2: API returns an object
            // Check for standard ApiResponse structure first
            if ("bookmarks" in bookmarkData && Array.isArray(bookmarkData.bookmarks)) {
              itemCount = bookmarkData.bookmarks.length;
            } else {
              // If not standard ApiResponse, check for other common structures like DataBookmarkResponse or ItemsBookmarkResponse
              if ("data" in bookmarkData && Array.isArray(bookmarkData.data)) {
                itemCount = bookmarkData.data.length;
              } else if ("items" in bookmarkData && Array.isArray(bookmarkData.items)) {
                itemCount = bookmarkData.items.length;
              }
            }
            // Note: We are only interested in the count for the first page if pagination is involved.
            // For an accurate total count, the API would ideally provide it directly,
            // or we'd have to fetch all pages, which is inefficient here.
          }

          return {
            ...list,
            count: itemCount,
          };
        } catch (e) {
          console.error(`Failed to get bookmark count for list ${list.id} (${list.name}):`, e);
          return { ...list, count: 0 } as ListWithCount; // Default to 0 on error
        }
      }),
    );

    return listsWithCount;
  });

  return {
    isLoading,
    lists: data || [],
    error,
    revalidate,
  };
}
