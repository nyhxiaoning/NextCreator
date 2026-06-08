import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  GitBranch,
  CloudUpload,
  CloudDownload,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Folder,
  Edit3,
  Save,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useModal, getModalAnimationClasses } from "@/hooks/useModal";
import { useGitHubFileStore } from "@/stores/githubFileStore";
import { toast } from "@/stores/toastStore";

interface GitHubFileDetailModalProps {
  fileId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GitHubFileDetailModal({ fileId, isOpen, onClose }: GitHubFileDetailModalProps) {
  const store = useGitHubFileStore();
  const file = store.files.find((f) => f.id === fileId);

  const { isVisible, isClosing, handleClose, handleBackdropClick } = useModal({
    isOpen,
    onClose,
  });
  const { backdropClasses, contentClasses } = getModalAnimationClasses(isVisible, isClosing);

  // 编辑状态
  const [editTab, setEditTab] = useState<"content" | "config">("content");
  const [editContent, setEditContent] = useState("");
  const [form, setForm] = useState({
    name: "",
    owner: "",
    repo: "",
    path: "",
    token: "",
  });
  const [showToken, setShowToken] = useState(false);

  // 确认对话框
  const [confirmAction, setConfirmAction] = useState<"delete" | "push" | "pull" | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      setEditContent(file.content);
      setForm({
        name: file.name,
        owner: file.owner,
        repo: file.repo,
        path: file.path,
        token: file.token,
      });
      setShowToken(false);
      setConfirmAction(null);
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const isSyncing = store.isSyncing[fileId] ?? false;

  // 保存编辑
  const handleSaveContent = () => {
    store.updateFileContent(fileId, editContent);
    toast.success("内容已保存");
  };

  // 保存配置
  const handleSaveConfig = () => {
    if (!form.name.trim()) {
      toast.warning("文件名不能为空");
      return;
    }
    store.renameFile(fileId, form.name.trim());
    store.updateFileConfig(fileId, {
      owner: form.owner,
      repo: form.repo,
      path: form.path,
      token: form.token,
    });
    toast.success("配置已保存");
  };

  // 删除文件
  const handleDelete = () => {
    store.removeFile(fileId);
    handleClose();
  };

  const getConfirmMessage = () => {
    switch (confirmAction) {
      case "push": return `确定将「${file.name}」推送到 GitHub 吗？将覆盖远程文件。`;
      case "pull": return `确定从 GitHub 拉取「${file.name}」吗？本地内容将被覆盖。`;
      case "delete": return `确定要删除「${file.name}」吗？本地记录将被移除。`;
      default: return "";
    }
  };

  const executeConfirm = async () => {
    if (confirmAction === "push") {
      setConfirmAction(null);
      // 先保存当前编辑内容
      store.updateFileContent(fileId, editContent);
      await store.pushToGitHub(fileId);
    } else if (confirmAction === "pull") {
      setConfirmAction(null);
      await store.pullFromGitHub(fileId);
      // 拉取后同步编辑框
      const updated = useGitHubFileStore.getState().files.find((f) => f.id === fileId);
      if (updated) setEditContent(updated.content);
    }
  };

  const fmtDate = (ts: number | null) => {
    if (!ts) return "从未同步";
    return new Date(ts).toLocaleString("zh-CN");
  };

  const tryFormatJson = (text: string) => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className={`absolute inset-0 transition-all duration-200 ease-out ${backdropClasses}`}
        onClick={handleBackdropClick}
      />
      <div
        className={`relative bg-base-100 rounded-2xl shadow-2xl w-[620px] max-h-[85vh] overflow-hidden flex flex-col transition-all duration-200 ease-out ${contentClasses}`}
        style={{ maxWidth: "calc(100vw - 40px)" }}
      >
        {/* 头部 */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-base-200/70">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-base-200 text-base-content shrink-0">
            <GitBranch className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold truncate">{file.name}</h2>
            <p className="text-xs text-base-content/50 mt-0.5">
              {file.owner}/{file.repo}/{file.path}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-square shrink-0" onClick={handleClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-base-200/70 px-6 gap-4">
          <button
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              editTab === "content"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/40 hover:text-base-content/60"
            }`}
            onClick={() => setEditTab("content")}
          >
            <Edit3 className="w-3.5 h-3.5 inline mr-1.5" />
            内容编辑
          </button>
          <button
            className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
              editTab === "config"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/40 hover:text-base-content/60"
            }`}
            onClick={() => setEditTab("config")}
          >
            <Folder className="w-3.5 h-3.5 inline mr-1.5" />
            GitHub 配置
          </button>
        </div>

        {/* 同步状态 */}
        {file.lastSyncedAt && (
          <div className="flex items-center gap-2 px-6 py-2 bg-success/8 border-b border-success/12">
            <div className="w-2 h-2 rounded-full bg-success shrink-0 shadow-[0_0_0_3px_rgba(45,122,69,0.14)]" />
            <span className="text-[11px] text-success-content/70">
              上次同步: {fmtDate(file.lastSyncedAt)}
            </span>
          </div>
        )}

        {/* 表单主体 */}
        <div className="flex-1 overflow-y-auto p-5">
          {editTab === "content" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-base-content/50">JSON 内容</span>
                <button
                  className="btn btn-ghost btn-xs gap-1"
                  onClick={() => setEditContent(tryFormatJson(editContent))}
                >
                  <RefreshCw className="w-3 h-3" />
                  格式化
                </button>
              </div>
              <textarea
                className="textarea textarea-bordered w-full font-mono text-xs leading-relaxed"
                style={{ minHeight: "300px" }}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="{}"
              />
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm gap-1.5"
                  onClick={handleSaveContent}
                >
                  <Save className="w-3.5 h-3.5" />
                  保存内容
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 文件名称 */}
              <div className="p-4 rounded-xl bg-base-200/50 border border-base-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center bg-base-300/70 text-base-content/50 shrink-0">
                    <Edit3 className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold text-base-content/70 tracking-wide">
                    文件信息
                  </span>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-base-content/50">
                    显示名称
                  </span>
                  <input
                    className="input input-bordered input-sm w-full"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>
              </div>

              {/* GitHub 配置 */}
              <div className="p-4 rounded-xl bg-base-200/50 border border-base-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center bg-base-300/70 text-base-content/50 shrink-0">
                    <Folder className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold text-base-content/70 tracking-wide">
                    仓库信息
                  </span>
                </div>
                <div className="flex gap-2.5">
                  <label className="flex flex-col gap-1.5 flex-[1.2]">
                    <span className="text-[11px] font-semibold text-base-content/50">用户名</span>
                    <input
                      className="input input-bordered input-sm w-full"
                      value={form.owner}
                      onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 flex-[1.8]">
                    <span className="text-[11px] font-semibold text-base-content/50">仓库名</span>
                    <input
                      className="input input-bordered input-sm w-full"
                      value={form.repo}
                      onChange={(e) => setForm((f) => ({ ...f, repo: e.target.value }))}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-base-content/50">文件路径</span>
                  <input
                    className="input input-bordered input-sm w-full"
                    value={form.path}
                    onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
                  />
                </label>
              </div>

              {/* Token */}
              <div className="p-4 rounded-xl bg-base-200/50 border border-base-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center bg-base-300/70 text-base-content/50 shrink-0">
                    <Lock className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-bold text-base-content/70 tracking-wide">认证</span>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-base-content/50">
                    Personal Access Token
                  </span>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      className="input input-bordered input-sm w-full pr-10"
                      value={form.token}
                      onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-base-content/40 hover:text-base-content/60 transition-colors"
                      onClick={() => setShowToken(!showToken)}
                      tabIndex={-1}
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>
              </div>

              {/* 保存配置 */}
              <button
                className="btn btn-primary btn-sm gap-1.5 w-full"
                onClick={handleSaveConfig}
              >
                <Save className="w-3.5 h-3.5" />
                保存配置
              </button>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-base-200/70">
          <div className="flex-1">
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1.5 text-error"
              onClick={() => setConfirmAction("delete")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除
            </button>
          </div>
          <button
            type="button"
            className="btn btn-sm gap-1.5"
            onClick={() => setConfirmAction("pull")}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudDownload className="w-3.5 h-3.5" />
            )}
            拉取
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm gap-1.5"
            onClick={() => setConfirmAction("push")}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5" />
            )}
            推送
          </button>
        </div>

        {/* 确认对话框 */}
        {confirmAction && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="bg-base-100 rounded-xl p-5 mx-4 max-w-sm shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-error/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-error" />
                </div>
                <h3 className="font-semibold">确认</h3>
              </div>
              <p className="text-sm text-base-content/70 mb-5">{getConfirmMessage()}</p>
              <div className="flex gap-2 justify-end">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmAction(null)}
                >
                  取消
                </button>
                {confirmAction === "delete" ? (
                  <button className="btn btn-error btn-sm" onClick={handleDelete}>
                    确认删除
                  </button>
                ) : (
                  <button
                    className={`btn btn-sm ${confirmAction === "push" ? "btn-primary" : "btn-warning"}`}
                    onClick={executeConfirm}
                    disabled={isSyncing}
                  >
                    {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    确认{confirmAction === "push" ? "推送" : "拉取"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
