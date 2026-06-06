import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { tauriStorage } from "@/utils/tauriStorage";
import { toast } from "@/stores/toastStore";
import { assembleProjectData, dispatchProjectData } from "@/services/projectService";
import {
  getFileSha,
  pushProject,
  pullProject,
  testConnection,
  type GitHubSyncConfig,
} from "@/services/githubSyncService";

type SyncDirection = "push" | "pull";

interface GitHubSyncState {
  // 持久化配置
  owner: string;
  repo: string;
  path: string;
  token: string;
  lastSyncedAt: number | null;

  // UI 状态（不持久化）
  isSyncing: boolean;
  syncDirection: SyncDirection | null;
  syncError: string | null;
  testResult: { success: boolean; message: string } | null;

  // 操作
  setConfig: (config: Partial<GitHubSyncConfig>) => void;
  clearConfig: () => void;
  setLastSyncedAt: (timestamp: number) => void;
  clearSyncError: () => void;
  clearTestResult: () => void;

  // 同步操作
  pushToGitHub: () => Promise<void>;
  pullFromGitHub: () => Promise<void>;
  testGitHubConnection: () => Promise<void>;
}

export const useGitHubSyncStore = create<GitHubSyncState>()(
  persist(
    (set, get) => ({
      // 持久化配置
      owner: "",
      repo: "",
      path: "nextcreator-backup.json",
      token: "",
      lastSyncedAt: null,

      // UI 状态
      isSyncing: false,
      syncDirection: null,
      syncError: null,
      testResult: null,

      setConfig: (config) => {
        set((state) => ({
          ...state,
          ...config,
          syncError: null,
          testResult: null,
        }));
      },

      clearConfig: () => {
        set({
          owner: "",
          repo: "",
          path: "nextcreator-backup.json",
          token: "",
          lastSyncedAt: null,
          syncError: null,
          testResult: null,
        });
      },

      setLastSyncedAt: (timestamp) => {
        set({ lastSyncedAt: timestamp });
      },

      clearSyncError: () => {
        set({ syncError: null });
      },

      clearTestResult: () => {
        set({ testResult: null });
      },

      testGitHubConnection: async () => {
        const state = get();
        if (!state.owner || !state.repo || !state.token) {
          toast.warning("请先填写仓库信息和 Token");
          return;
        }

        set({ testResult: null });
        const result = await testConnection({
          owner: state.owner,
          repo: state.repo,
          path: state.path,
          token: state.token,
        });

        set({ testResult: result });
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      },

      pushToGitHub: async () => {
        const state = get();
        if (!state.owner || !state.repo || !state.path || !state.token) {
          toast.warning("请先完成 GitHub 同步配置");
          return;
        }

        set({ isSyncing: true, syncDirection: "push", syncError: null });

        try {
          const config: GitHubSyncConfig = {
            owner: state.owner,
            repo: state.repo,
            path: state.path,
            token: state.token,
          };

          // 组装当前项目数据
          const projectData = assembleProjectData();

          // 获取远程文件 SHA（如果存在）
          const sha = await getFileSha(config);

          // 推送到 GitHub
          await pushProject(config, projectData, sha);

          const now = Date.now();
          set({ lastSyncedAt: now, isSyncing: false, syncDirection: null });
          toast.success("项目数据已成功推送到 GitHub");
        } catch (error) {
          const message = error instanceof Error ? error.message : "推送失败";
          set({ syncError: message, isSyncing: false, syncDirection: null });
          toast.error(`推送到 GitHub 失败: ${message}`);
        }
      },

      pullFromGitHub: async () => {
        const state = get();
        if (!state.owner || !state.repo || !state.path || !state.token) {
          toast.warning("请先完成 GitHub 同步配置");
          return;
        }

        set({ isSyncing: true, syncDirection: "pull", syncError: null });

        try {
          const config: GitHubSyncConfig = {
            owner: state.owner,
            repo: state.repo,
            path: state.path,
            token: state.token,
          };

          // 从 GitHub 拉取数据
          const projectData = await pullProject(config);

          // 分发到各 store（替换模式）
          dispatchProjectData(projectData, false);

          const now = Date.now();
          set({ lastSyncedAt: now, isSyncing: false, syncDirection: null });
          toast.success("已从 GitHub 拉取并恢复项目数据");
        } catch (error) {
          const message = error instanceof Error ? error.message : "拉取失败";
          set({ syncError: message, isSyncing: false, syncDirection: null });
          toast.error(`从 GitHub 拉取失败: ${message}`);
        }
      },
    }),
    {
      name: "github-sync-config",
      storage: createJSONStorage(() => tauriStorage),
      partialize: (state) => ({
        owner: state.owner,
        repo: state.repo,
        path: state.path,
        token: state.token,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
