import { applyLoadStateMessage } from "./loadState";

describe("applyLoadStateMessage", () => {
  it("收到错误消息后结束所有 loading 并记录错误信息", () => {
    expect(
      applyLoadStateMessage(
        {
          loading: true,
          treeListLoading: true,
          loadErrorMessage: "",
        },
        {
          command: "error",
          data: {
            message: "获取接口树失败，请重试",
          },
        },
      ),
    ).toEqual({
      loading: false,
      treeListLoading: false,
      loadErrorMessage: "获取接口树失败，请重试",
    });
  });

  it("收到工作区状态后清空错误并结束 loading", () => {
    expect(
      applyLoadStateMessage(
        {
          loading: true,
          treeListLoading: true,
          loadErrorMessage: "旧错误",
        },
        {
          command: "getWorkspaceState",
          data: {},
        },
      ),
    ).toEqual({
      loading: false,
      treeListLoading: false,
      loadErrorMessage: "",
    });
  });
});
