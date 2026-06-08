import { useState } from "react";
import {
  Plus,
  GitBranch,
  Loader2,
} from "lucide-react";
import { useGitHubFileStore } from "@/stores/githubFileStore";
import { GitHubFileDetailModal } from "./GitHubFileDetailModal";
import { AddGitHubFileModal } from "./AddGitHubFileModal";

export function GitHubFileBar() {
  const { files } = useGitHubFileStore();
  const [detailFileId, setDetailFileId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1 px-4 py-1 bg-base-200/20 border-b border-base-200/50 overflow-x-auto min-h-8">
        <GitBranch className="w-3 h-3 text-base-content/30 shrink-0" />
        {files.length === 0 ? (
          <span className="text-[11px] text-base-content/30 mr-2">GitHub 同步文件</span>
        ) : (
          files.map((file) => {
            const isSyncing = useGitHubFileStore.getState().isSyncing[file.id] ?? false;
            return (
              <button
                key={file.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  detailFileId === file.id
                    ? "bg-primary/12 text-primary"
                    : "text-base-content/60 hover:text-base-content/80 hover:bg-base-300/50"
                }`}
                onClick={() => setDetailFileId(file.id)}
              >
                {isSyncing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-base-content/20 shrink-0" />
                )}
                {file.name}
                {file.lastSyncedAt && (
                  <span className="w-1.5 h-1.5 rounded-full bg-success/60 shrink-0 ml-0.5" />
                )}
              </button>
            );
          })
        )}
        <button
          className="inline-flex items-center justify-center w-5 h-5 rounded-md text-base-content/40 hover:text-base-content/60 hover:bg-base-300/50 transition-colors shrink-0"
          onClick={() => setShowAddModal(true)}
          title="添加文件"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {detailFileId && (
        <GitHubFileDetailModal
          fileId={detailFileId}
          isOpen={true}
          onClose={() => setDetailFileId(null)}
        />
      )}

      {showAddModal && (
        <AddGitHubFileModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreated={(id) => {
            setShowAddModal(false);
            setDetailFileId(id);
          }}
        />
      )}
    </>
  );
}
