/**
 * GitHub 多文件管理 Store
 * 管理多个 GitHub 文件条目，每个条目有独立的仓库路径和内容
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { tauriStorage } from "@/utils/tauriStorage";
import { toast } from "@/stores/toastStore";
import {
  getFileSha,
  pushRawContent,
  pullRawContent,
  type GitHubSyncConfig,
} from "@/services/githubSyncService";

export interface GitHubFileEntry {
  id: string;
  name: string;
  content: string;
  owner: string;
  repo: string;
  path: string;
  token: string;
  lastSyncedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface GitHubFileState {
  files: GitHubFileEntry[];
  activeFileId: string | null;
  isSyncing: Record<string, boolean>;
  syncErrors: Record<string, string | null>;

  addFile: (entry: {
    name: string;
    content?: string;
    owner: string;
    repo: string;
    path: string;
    token: string;
  }) => string;
  removeFile: (id: string) => void;
  renameFile: (id: string, name: string) => void;
  updateFileContent: (id: string, content: string) => void;
  updateFileConfig: (id: string, config: Partial<Pick<GitHubFileEntry, "owner" | "repo" | "path" | "token">>) => void;
  setActiveFile: (id: string | null) => void;

  pushToGitHub: (id: string) => Promise<void>;
  pullFromGitHub: (id: string) => Promise<void>;
}

export const useGitHubFileStore = create<GitHubFileState>()(
  persist(
    (set, get) => ({
      files: [],
      activeFileId: null,
      isSyncing: {},
      syncErrors: {},

      addFile: (entry) => {
        const id = uuidv4();
        const now = Date.now();
        const newFile: GitHubFileEntry = {
          id,
          name: entry.name,
          content: entry.content || "{}",
          owner: entry.owner,
          repo: entry.repo,
          path: entry.path,
          token: entry.token,
          lastSyncedAt: null,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          files: [...state.files, newFile],
          activeFileId: id,
        }));

        toast.success(`文件「${entry.name}」已添加`);
        return id;
      },

      removeFile: (id) => {
        const file = get().files.find((f) => f.id === id);
        set((state) => ({
          files: state.files.filter((f) => f.id !== id),
          activeFileId: state.activeFileId === id ? null : state.activeFileId,
        }));
        if (file) {
          toast.success(`文件「${file.name}」已删除`);
        }
      },

      renameFile: (id, name) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, name, updatedAt: Date.now() } : f
          ),
        }));
      },

      updateFileContent: (id, content) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, content, updatedAt: Date.now() } : f
          ),
        }));
      },

      updateFileConfig: (id, config) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, ...config, updatedAt: Date.now() } : f
          ),
        }));
      },

      setActiveFile: (id) => {
        set({ activeFileId: id });
      },

      pushToGitHub: async (id) => {
        const file = get().files.find((f) => f.id === id);
        if (!file) return;

        if (!file.owner || !file.repo || !file.path || !file.token) {
          toast.warning("请先完善 GitHub 配置");
          return;
        }

        set((state) => ({
          isSyncing: { ...state.isSyncing, [id]: true },
          syncErrors: { ...state.syncErrors, [id]: null },
        }));

        try {
          const config: GitHubSyncConfig = {
            owner: file.owner,
            repo: file.repo,
            path: file.path,
            token: file.token,
          };

          const sha = await getFileSha(config);
          await pushRawContent(config, file.content, sha);

          const now = Date.now();
          set((state) => ({
            files: state.files.map((f) =>
              f.id === id ? { ...f, lastSyncedAt: now, updatedAt: now } : f
            ),
            isSyncing: { ...state.isSyncing, [id]: false },
          }));
          toast.success(`「${file.name}」已推送到 GitHub`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "推送失败";
          set((state) => ({
            isSyncing: { ...state.isSyncing, [id]: false },
            syncErrors: { ...state.syncErrors, [id]: message },
          }));
          toast.error(`推送失败: ${message}`);
        }
      },

      pullFromGitHub: async (id) => {
        const file = get().files.find((f) => f.id === id);
        if (!file) return;

        if (!file.owner || !file.repo || !file.path || !file.token) {
          toast.warning("请先完善 GitHub 配置");
          return;
        }

        set((state) => ({
          isSyncing: { ...state.isSyncing, [id]: true },
          syncErrors: { ...state.syncErrors, [id]: null },
        }));

        try {
          const config: GitHubSyncConfig = {
            owner: file.owner,
            repo: file.repo,
            path: file.path,
            token: file.token,
          };

          const content = await pullRawContent(config);

          const now = Date.now();
          set((state) => ({
            files: state.files.map((f) =>
              f.id === id ? { ...f, content, lastSyncedAt: now, updatedAt: now } : f
            ),
            isSyncing: { ...state.isSyncing, [id]: false },
          }));
          toast.success(`「${file.name}」已从 GitHub 拉取`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "拉取失败";
          set((state) => ({
            isSyncing: { ...state.isSyncing, [id]: false },
            syncErrors: { ...state.syncErrors, [id]: message },
          }));
          toast.error(`拉取失败: ${message}`);
        }
      },
    }),
    {
      name: "next-creator-github-files",
      storage: createJSONStorage(() => tauriStorage),
      partialize: (state) => ({
        files: state.files,
        activeFileId: state.activeFileId,
      }),
    }
  )
);
