import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  GitBranch,
  CloudUpload,
  CloudDownload,
  Trash2,
  AlertTriangle,
  Check,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useModal, getModalAnimationClasses } from "@/hooks/useModal";
import { useGitHubSyncStore } from "@/stores/githubSyncStore";
import { toast } from "@/stores/toastStore";

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GitHubSyncModal({ isOpen, onClose }: GitHubSyncModalProps) {
  const store = useGitHubSyncStore();
  const {
    isSyncing,
    syncDirection,
    testResult,
  } = store;

  const { isVisible, isClosing, handleClose, handleBackdropClick } = useModal({
    isOpen,
    onClose,
  });
  const { backdropClasses, contentClasses } = getModalAnimationClasses(isVisible, isClosing);

  // 本地表单状态
  const [form, setForm] = useState({
    owner: "",
    repo: "",
    path: "",
    token: "",
  });

  // 确认对话框状态
  const [confirmAction, setConfirmAction] = useState<"push" | "pull" | "clear" | null>(null);

  // 打开时加载配置
  useEffect(() => {
    if (isOpen) {
      setForm({
        owner: store.owner || "",
        repo: store.repo || "",
        path: store.path || "nextcreator-backup.json",
        token: store.token || "",
      });
    }
  }, [isOpen]);

  // 是否已配置
  const isConfigured = !!store.owner && !!store.repo && !!store.path && !!store.token && !!store.lastSyncedAt;

  // 保存配置
  const handleSave = () => {
    if (!form.owner || !form.repo || !form.path || !form.token) {
      toast.warning("请填写所有必填项");
      return;
    }
    store.setConfig(form);
    toast.success("GitHub 同步配置已保存");
    handleClose();
  };

  // 清除配置
  const handleClear = () => {
    setConfirmAction("clear");
  };

  const executeClear = () => {
    store.clearConfig();
    setForm({ owner: "", repo: "", path: "nextcreator-backup.json", token: "" });
    setConfirmAction(null);
    toast.success("同步配置已清除");
    handleClose();
  };

  // 执行确认的操作
  const executeConfirm = async () => {
    if (confirmAction === "push") {
      setConfirmAction(null);
      await store.pushToGitHub();
    } else if (confirmAction === "pull") {
      setConfirmAction(null);
      await store.pullFromGitHub();
    }
  };

  // 获取确认对话框提示
  const getConfirmMessage = () => {
    switch (confirmAction) {
      case "push":
        return "这将把当前所有项目数据推送到 GitHub，覆盖远程文件。确定继续？";
      case "pull":
        return "这将从 GitHub 拉取数据并替换本地所有数据，当前本地数据将丢失。确定继续？";
      case "clear":
        return "确定要清除 GitHub 同步配置吗？";
      default:
        return "";
    }
  };

  // 格式化时间
  const fmtDate = (ts: number | null) => {
    if (!ts) return "";
    return new Date(ts).toLocaleString("zh-CN");
  };

  if (!isOpen) return null;

  const modalContent = createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className={`
          absolute inset-0
          transition-all duration-200 ease-out
          ${backdropClasses}
        `}
        onClick={handleBackdropClick}
      />

      {/* Modal 内容 */}
      <div
        className={`
          relative bg-base-100 rounded-2xl shadow-2xl w-[520px] max-h-[85vh] overflow-hidden flex flex-col
          transition-all duration-200 ease-out
          ${contentClasses}
        `}
        style={{ maxWidth: "calc(100vw - 40px)" }}
      >
        {/* 头部 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-base-200">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-base-200 text-base-content shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold">GitHub 同步</h2>
            <p className="text-xs text-base-content/60 mt-0.5 leading-relaxed">
              配置后可将项目数据推送/拉取到 GitHub 仓库
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-square shrink-0" onClick={handleClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 已配置状态横幅 */}
        {isConfigured && (
          <div className="flex items-center gap-2.5 px-5 py-3 bg-success/10 border-b border-success/15">
            <div className="w-2 h-2 rounded-full bg-success shrink-0 shadow-[0_0_0_3px_rgba(45,122,69,0.14)]" />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-xs font-semibold text-success-content">已配置同步</span>
              <span className="text-[11px] text-success-content/65">
                上次同步: {fmtDate(store.lastSyncedAt)}
              </span>
            </div>
            <button
              className="btn btn-ghost btn-xs text-error"
              onClick={() => setConfirmAction("clear")}
            >
              解除
            </button>
          </div>
        )}

        {/* 表单主体 */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            {/* 仓库信息 */}
            <div className="p-3.5 rounded-xl bg-base-200/60 border border-base-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-base-300 text-base-content/60 shrink-0">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-base-content/80 tracking-wide">仓库信息</span>
              </div>

              <div className="flex gap-2.5">
                <label className="flex flex-col gap-1.5 flex-[1.2]">
                  <span className="text-[11px] font-semibold text-base-content/60">用户名</span>
                  <Input
                    placeholder="如 nyhxiaoning"
                    value={form.owner}
                    onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1.5 flex-[1.8]">
                  <span className="text-[11px] font-semibold text-base-content/60">仓库名</span>
                  <Input
                    placeholder="如 my-project-backup"
                    value={form.repo}
                    onChange={(e) => setForm((f) => ({ ...f, repo: e.target.value }))}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-base-content/60">文件路径</span>
                <Input
                  placeholder="如 nextcreator-backup.json"
                  value={form.path}
                  onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
                />
                <span className="text-[10.5px] text-base-content/40 leading-relaxed">
                  数据存储路径，建议按项目命名
                </span>
              </label>
            </div>

            {/* 认证 */}
            <div className="p-3.5 rounded-xl bg-base-200/60 border border-base-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center bg-base-300 text-base-content/60 shrink-0">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-base-content/80 tracking-wide">认证</span>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-base-content/60">Personal Access Token</span>
                <Input
                  isPassword
                  placeholder="ghp_..."
                  value={form.token}
                  onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                />
                <span className="text-[10.5px] text-base-content/40 leading-relaxed">
                  需要 <code className="text-[10px] bg-base-300 px-1 py-0.5 rounded">repo</code> 权限。{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-semibold no-underline hover:underline"
                  >
                    创建 Token →
                  </a>
                </span>
              </label>
            </div>

            {/* 测试连接 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-1.5"
                onClick={store.testGitHubConnection}
                disabled={isSyncing || !form.owner || !form.repo || !form.token}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                测试连接
              </button>
              {testResult && (
                <span className={`text-xs flex items-center gap-1 ${
                  testResult.success ? "text-success" : "text-error"
                }`}>
                  {testResult.success ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {testResult.message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-base-200">
          <div className="flex-1">
            {isConfigured && (
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-1.5 text-error"
                onClick={handleClear}
                disabled={isSyncing}
              >
                <Trash2 className="w-3.5 h-3.5" />
                解除同步
              </button>
            )}
          </div>

          {/* Push / Pull 按钮 */}
          {isConfigured && (
            <>
              <button
                type="button"
                className="btn btn-sm gap-1.5"
                onClick={() => setConfirmAction("pull")}
                disabled={isSyncing}
              >
                {isSyncing && syncDirection === "pull" ? (
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
                {isSyncing && syncDirection === "push" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                推送
              </button>
            </>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
            disabled={isSyncing}
          >
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={isSyncing}
          >
            保存配置
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
                <h3 className="font-semibold">确认{confirmAction === "push" ? "推送" : confirmAction === "pull" ? "拉取" : "解除"}</h3>
              </div>
              <p className="text-sm text-base-content/70 mb-5">
                {getConfirmMessage()}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmAction(null)}
                  disabled={isSyncing}
                >
                  取消
                </button>
                {confirmAction === "clear" ? (
                  <button className="btn btn-error btn-sm" onClick={executeClear}>
                    确认解除
                  </button>
                ) : (
                  <button
                    className={`btn btn-sm ${confirmAction === "push" ? "btn-primary" : "btn-warning"}`}
                    onClick={executeConfirm}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
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

  return modalContent;
}
