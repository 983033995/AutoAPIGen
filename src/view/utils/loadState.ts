type LoadState = {
  loading: boolean;
  treeListLoading: boolean;
  loadErrorMessage: string;
};

type LoadStateMessage = {
  command: string;
  data?: Record<string, any>;
};

export function applyLoadStateMessage(
  state: LoadState,
  message: LoadStateMessage,
): LoadState {
  switch (message.command) {
    case "getWorkspaceState":
      return {
        loading: false,
        treeListLoading: false,
        loadErrorMessage: "",
      };
    case "loadData":
      return {
        ...state,
        loading: true,
        loadErrorMessage: "",
      };
    case "joinEnd":
      return {
        ...state,
        treeListLoading: false,
      };
    case "error":
      return {
        loading: false,
        treeListLoading: false,
        loadErrorMessage: message.data?.message || "加载失败，请重试",
      };
    default:
      return state;
  }
}
