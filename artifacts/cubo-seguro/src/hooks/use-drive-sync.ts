import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSourcesQueryKey, getGetSyncStatusQueryKey, useGetSyncStatus, useSyncSources } from "@workspace/api-client-react";

export function useDriveSync() {
  const qc = useQueryClient();
  const query = useGetSyncStatus({ query: {
    queryKey: getGetSyncStatusQueryKey(),
    refetchInterval: (q) => q.state.data?.status === "running" ? 1500 : 10000,
    staleTime: 0,
  } });
  const mutation = useSyncSources({ mutation: {
    onSuccess: (job) => qc.setQueryData(getGetSyncStatusQueryKey(), job),
  } });
  const finishedAt = query.data?.finishedAt;
  useEffect(() => {
    if (finishedAt) void qc.invalidateQueries({ queryKey: getGetSourcesQueryKey() });
  }, [finishedAt, qc]);
  return {
    ...query, mutation,
    running: query.data?.status === "running" || mutation.isPending,
    start: () => mutation.mutate(undefined),
  };
}
