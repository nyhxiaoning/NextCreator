import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  GitBranch,
  Eye,
  EyeOff,
  Lock,
  Folder,
  Plus,
} from "lucide-react";
import { useModal, getModalAnimationClasses } from "@/hooks/useModal";
import { useGitHubFileStore } from "@/stores/githubFileStore";
import { toast } from "@/stores/toastStore";

interface AddGitHubFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (fileId: string) => void;
}

export function AddGitHubFileModal({ isOpen, onClose, onCreated }: AddGitHubFileModalProps) {
  const store = useGitHubFileStore();

  const { isVisible, isClosing, handleClose, handleBackdropClick } = useModal({
    isOpen,
    onClose,
  });
  const { backdropClasses, contentClasses } = getModalAnimationClasses(isVisible, isClosing);

  const [form, setForm] = useState({
    name: "",
    owner: "",
    repo: "",
    path: "",
    token: "",
  });
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ name: "", owner: "", repo: "", path: "", token: "" });
      setShowToken(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast.warning("请输入文件显示名称");
      return;
    }
    if (!form.owner || !form.repo || !form.path || !form.token) {
      toast.warning("请填写所有 GitHub 配置项");
      return;
    }
    const id = store.addFile({
      name: form.name.trim(),
      content: "{}",
      owner: form.owner,
      repo: form.repo,
      path: form.path,
      token: form.token,
    });
    onCreated(id);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className={`absolute inset-0 transition-all duration-200 ease-out ${backdropClasses}`}
        onClick={handleBackdropClick}
      />
      <div
        className={`relative bg-base-100 rounded-2xl shadow-2xl w-[520px] max-h-[85vh] overflow-hidden flex flex-col transition-all duration-200 ease-out ${contentClasses}`}
        style={{ maxWidth: "calc(100vw - 40px)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-base-200/70">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-base-200 text-base-content shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold">添加同步文件</h2>
            <p className="text-xs text-base-content/50 mt-0.5">
              添加一个 GitHub 文件到列表中
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-square shrink-0" onClick={handleClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* File Name */}
          <div className="p-4 rounded-xl bg-base-200/50 border border-base-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-base-content/70 tracking-wide">
                显示名称
              </span>
            </div>
            <label className="flex flex-col gap-1.5">
              <input
                className="input input-bordered input-sm w-full"
                placeholder="如 项目配置备份"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
          </div>

          {/* Repo */}
          <div className="p-4 rounded-xl bg-base-200/50 border border-base-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center bg-base-300/70 text-base-content/50 shrink-0">
                <Folder className="w-3 h-3" />
              </div>
              <span className="text-xs font-bold text-base-content/70 tracking-wide">仓库信息</span>
            </div>
            <div className="flex gap-2.5">
              <label className="flex flex-col gap-1.5 flex-[1.2]">
                <span className="text-[11px] font-semibold text-base-content/50">用户名</span>
                <input
                  className="input input-bordered input-sm w-full"
                  placeholder="如 nyhxiaoning"
                  value={form.owner}
                  onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1.5 flex-[1.8]">
                <span className="text-[11px] font-semibold text-base-content/50">仓库名</span>
                <input
                  className="input input-bordered input-sm w-full"
                  placeholder="如 my-backup"
                  value={form.repo}
                  onChange={(e) => setForm((f) => ({ ...f, repo: e.target.value }))}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-base-content/50">文件路径</span>
              <input
                className="input input-bordered input-sm w-full"
                placeholder="如 data/config.json"
                value={form.path}
                onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
              />
              <span className="text-[10.5px] text-base-content/40">GitHub 仓库中的文件路径</span>
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
                  placeholder="ghp_..."
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
              <span className="text-[10.5px] text-base-content/40 leading-relaxed">
                需要 <code className="text-[10px] bg-base-300 px-1 py-0.5 rounded">repo</code> 权限。
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-semibold no-underline hover:underline ml-1"
                >
                  创建 Token →
                </a>
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-base-200/70">
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            取消
          </button>
          <button className="btn btn-primary btn-sm gap-1.5 ml-auto" onClick={handleCreate}>
            <Plus className="w-3.5 h-3.5" />
            添加文件
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
