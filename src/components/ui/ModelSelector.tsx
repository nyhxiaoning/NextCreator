import { useState, useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check, Trash2, Search, Plus } from "lucide-react";
import { useCustomModelStore, type ModelCategory } from "@/stores/customModelStore";

export interface ModelOption {
  value: string;
  label: string;
}

interface ModelSelectorProps {
  value: string;
  options: ModelOption[];
  onChange: (value: string) => void;
  /** 是否允许自定义模型输入 */
  allowCustom?: boolean;
  /** 自定义模型输入的占位符 */
  customPlaceholder?: string;
  /** 按钮样式变体 */
  variant?: "primary" | "warning" | "info";
  /** 弹窗标题 */
  title?: string;
  className?: string;
  /** 模型分类，用于保存和读取用户自定义模型 */
  modelCategory?: ModelCategory;
  /** 展示方式：modal 适合画布节点，inline 适合右侧 Inspector */
  mode?: "modal" | "inline";
}

/**
 * 模型选择器组件
 * 点击后弹出 modal 选择模型，避免画布 transform 导致的渲染问题
 */
export function ModelSelector({
  value,
  options,
  onChange,
  allowCustom = true,
  customPlaceholder = "输入模型名称...",
  variant = "primary",
  title = "选择模型",
  className = "",
  modelCategory,
  mode = "modal",
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const customModels = useCustomModelStore((state) =>
    modelCategory ? state.getCustomModels(modelCategory) : []
  );

  const selectedPreset = options.find((opt) => opt.value === value);
  // 检查是否是自定义模型（不在预设列表中）
  const isCustomModel = Boolean(value) && !selectedPreset;
  const compactDisplayName = selectedPreset
    ? selectedPreset.label === selectedPreset.value
      ? selectedPreset.label
      : `${selectedPreset.label} (${selectedPreset.value})`
    : value || "选择模型";
  const inlineDisplayLabel = selectedPreset?.label || value || "选择模型";
  const inlineDisplayMeta = selectedPreset && selectedPreset.label !== selectedPreset.value
    ? selectedPreset.value
    : isCustomModel
      ? "自定义模型"
      : "";
  const accentTextClass = getAccentTextClass(variant);

  // 处理选择
  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  };

  useEffect(() => {
    if (mode !== "inline" || !isOpen) return;

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, mode]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <label className="text-xs text-base-content/60 mb-0.5 block">模型</label>
      <button
        type="button"
        className={`
          w-full flex items-center justify-between gap-2 rounded-lg
          bg-base-200/70 hover:bg-base-200 border border-base-300/70
          transition-colors
          ${mode === "inline" ? "min-h-9 px-3 py-2 text-sm" : "px-2 py-1.5 text-xs"}
          ${isOpen ? `bg-base-100 ring-2 ${getOpenStateClass(variant)}` : ""}
        `}
        onClick={() => setIsOpen((open) => !open)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 flex-1 text-left">
          <span className={`block truncate ${isCustomModel ? `${accentTextClass} font-medium` : "text-base-content"}`}>
            {mode === "inline" ? inlineDisplayLabel : compactDisplayName}
          </span>
          {mode === "inline" && inlineDisplayMeta && (
            <span className="mt-0.5 block truncate text-[11px] leading-none text-base-content/45">
              {inlineDisplayMeta}
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-base-content/45 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && mode === "modal" && (
        <ModelSelectorModal
          value={value}
          options={options}
          onChange={handleSelect}
          onClose={() => setIsOpen(false)}
          allowCustom={allowCustom}
          customPlaceholder={customPlaceholder}
          variant={variant}
          title={title}
          modelCategory={modelCategory}
          customModels={customModels}
        />
      )}
      {isOpen && mode === "inline" && (
        <ModelSelectorDropdown
          value={value}
          options={options}
          onChange={handleSelect}
          allowCustom={allowCustom}
          customPlaceholder={customPlaceholder}
          variant={variant}
          modelCategory={modelCategory}
          customModels={customModels}
        />
      )}
    </div>
  );
}

interface ModelSelectorDropdownProps {
  value: string;
  options: ModelOption[];
  onChange: (value: string) => void;
  allowCustom: boolean;
  customPlaceholder: string;
  variant: "primary" | "warning" | "info";
  modelCategory?: ModelCategory;
  customModels: string[];
}

function getSelectedBgClass(variant: "primary" | "warning" | "info") {
  switch (variant) {
    case "warning":
      return "bg-warning/15 text-warning border-warning/25 shadow-[inset_3px_0_0_hsl(var(--wa))]";
    case "info":
      return "bg-info/15 text-info border-info/25 shadow-[inset_3px_0_0_hsl(var(--in))]";
    default:
      return "bg-primary/15 text-primary border-primary/25 shadow-[inset_3px_0_0_hsl(var(--p))]";
  }
}

function getOpenStateClass(variant: "primary" | "warning" | "info") {
  switch (variant) {
    case "warning":
      return "border-warning/50 ring-warning/15";
    case "info":
      return "border-info/50 ring-info/15";
    default:
      return "border-primary/50 ring-primary/15";
  }
}

function getAccentTextClass(variant: "primary" | "warning" | "info") {
  switch (variant) {
    case "warning":
      return "text-warning";
    case "info":
      return "text-info";
    default:
      return "text-primary";
  }
}

function getAccentSoftClass(variant: "primary" | "warning" | "info") {
  switch (variant) {
    case "warning":
      return "bg-warning/10 text-warning border-warning/20 hover:bg-warning/15";
    case "info":
      return "bg-info/10 text-info border-info/20 hover:bg-info/15";
    default:
      return "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15";
  }
}

function modelMatchesQuery(label: string, value: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${label} ${value}`.toLowerCase().includes(normalizedQuery);
}

function ModelSelectorDropdown({
  value,
  options,
  onChange,
  allowCustom,
  customPlaceholder,
  variant,
  modelCategory,
  customModels,
}: ModelSelectorDropdownProps) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { addCustomModel, removeCustomModel } = useCustomModelStore();
  const isCustomModel = !options.some((opt) => opt.value === value) && !customModels.includes(value);
  const trimmedQuery = query.trim();
  const filteredOptions = options.filter((opt) => modelMatchesQuery(opt.label, opt.value, query));
  const filteredCustomModels = customModels.filter((model) => modelMatchesQuery(model, model, query));
  const exactMatchExists = [...options.map((opt) => opt.value), ...customModels].some(
    (model) => model.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const canAddQuery = allowCustom && trimmedQuery.length > 0 && !exactMatchExists;
  const hasResults = filteredOptions.length > 0 || filteredCustomModels.length > 0 || canAddQuery;
  const selectedClassName = getSelectedBgClass(variant);
  const addOptionClassName = getAccentSoftClass(variant);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleCustomModelSubmit = (modelName = query) => {
    const trimmed = modelName.trim();
    if (!trimmed) return;
    if (modelCategory) {
      addCustomModel(modelCategory, trimmed);
    }
    onChange(trimmed);
  };

  const handleRemoveCustomModel = (model: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (modelCategory) {
      removeCustomModel(modelCategory, model);
    }
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const firstMatch = filteredOptions[0]?.value || filteredCustomModels[0];
    if (firstMatch) {
      onChange(firstMatch);
      return;
    }
    if (canAddQuery) {
      handleCustomModelSubmit(trimmedQuery);
    }
  };

  const renderPresetOption = (opt: ModelOption) => {
    const selected = value === opt.value;

    return (
      <button
        key={opt.value}
        type="button"
        className={`
          flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-sm
          transition-colors
          ${selected
            ? selectedClassName
            : "border-transparent bg-transparent text-base-content hover:bg-base-200/80"
          }
        `}
        onClick={() => onChange(opt.value)}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{opt.label}</span>
          {opt.label !== opt.value && (
            <span className="mt-0.5 block truncate text-[11px] leading-none text-base-content/45">
              {opt.value}
            </span>
          )}
        </span>
        {selected && <Check className="h-4 w-4 flex-shrink-0" />}
      </button>
    );
  };

  const renderCustomOption = (model: string) => {
    const selected = value === model;

    return (
      <div
        key={model}
        className={`
          group flex w-full items-center rounded-md border text-sm transition-colors
          ${selected
            ? selectedClassName
            : "border-transparent bg-transparent text-base-content hover:bg-base-200/80"
          }
        `}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-2 text-left"
          onClick={() => onChange(model)}
        >
          <span className="min-w-0">
            <span className="block truncate font-medium">{model}</span>
            <span className="mt-0.5 block truncate text-[11px] leading-none text-base-content/45">
              自定义模型
            </span>
          </span>
          {selected && <Check className="h-4 w-4" />}
        </button>
        <span className="flex flex-shrink-0 items-center pr-1.5">
          <button
            type="button"
            className="
              rounded p-1 text-base-content/40 opacity-0 transition-colors
              hover:bg-error/15 hover:text-error group-hover:opacity-100 focus:opacity-100
            "
            onClick={(event) => handleRemoveCustomModel(model, event)}
            title="删除此模型"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    );
  };

  return (
    <div
      className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-xl"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="border-b border-base-300/70 bg-base-200/25 p-2">
        <div className="flex items-center gap-2 rounded-lg border border-base-300/70 bg-base-100 px-2.5 py-2">
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-base-content/35" />
          <input
            ref={searchInputRef}
            type="text"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/35"
            placeholder={allowCustom ? customPlaceholder : "搜索模型"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto p-1.5">
        {isCustomModel && value && (
          <button
            type="button"
            className={`mb-1 flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-sm ${selectedClassName}`}
            onClick={() => onChange(value)}
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{value}</span>
              <span className="mt-0.5 block truncate text-[11px] leading-none opacity-70">
                当前自定义模型
              </span>
            </span>
            <Check className="h-4 w-4 flex-shrink-0" />
          </button>
        )}

        {filteredOptions.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-medium text-base-content/45">预设模型</div>
            {filteredOptions.map(renderPresetOption)}
          </div>
        )}

        {allowCustom && filteredCustomModels.length > 0 && (
          <div className="mt-1 border-t border-base-300/70 pt-1.5">
            <div className="px-2 py-1 text-[11px] font-medium text-base-content/45">我的模型</div>
            {filteredCustomModels.map(renderCustomOption)}
          </div>
        )}

        {canAddQuery && (
          <div className={filteredOptions.length > 0 || filteredCustomModels.length > 0 ? "mt-1 border-t border-base-300/70 pt-1.5" : ""}>
            <button
              type="button"
              className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors ${addOptionClassName}`}
              onClick={() => handleCustomModelSubmit(trimmedQuery)}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="min-w-0">
                <span className="block truncate font-medium">添加 “{trimmedQuery}”</span>
                <span className="mt-0.5 block truncate text-[11px] leading-none opacity-70">
                  保存为自定义模型
                </span>
              </span>
            </button>
          </div>
        )}

        {!hasResults && (
          <div className="px-3 py-6 text-center text-xs text-base-content/45">
            没有匹配的模型
          </div>
        )}

        {allowCustom && !trimmedQuery && (
          <div className="border-t border-base-300/70 px-2 py-2 text-[11px] text-base-content/40">
            输入模型名后按 Enter 可添加自定义模型
          </div>
        )}
      </div>
    </div>
  );
}

// Modal 弹窗组件
interface ModelSelectorModalProps {
  value: string;
  options: ModelOption[];
  onChange: (value: string) => void;
  onClose: () => void;
  allowCustom: boolean;
  customPlaceholder: string;
  variant: "primary" | "warning" | "info";
  title: string;
  modelCategory?: ModelCategory;
  customModels: string[];
}

function ModelSelectorModal({
  value,
  options,
  onChange,
  onClose,
  allowCustom,
  customPlaceholder,
  variant,
  title,
  modelCategory,
  customModels,
}: ModelSelectorModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [customModel, setCustomModel] = useState("");

  const { addCustomModel, removeCustomModel } = useCustomModelStore();

  // 检查是否是自定义模型（不在预设列表中，也不在用户自定义列表中）
  const isCustomModel = !options.some((opt) => opt.value === value) && !customModels.includes(value);

  // 进入动画
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // 关闭时先播放退出动画
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // 选择预设模型
  const handleSelectPreset = (modelValue: string) => {
    onChange(modelValue);
  };

  // 使用自定义模型
  const handleCustomModelSubmit = () => {
    const trimmed = customModel.trim();
    if (trimmed) {
      // 保存到自定义模型列表（如果指定了分类）
      if (modelCategory) {
        addCustomModel(modelCategory, trimmed);
      }
      onChange(trimmed);
    }
  };

  // 删除用户自定义模型
  const handleRemoveCustomModel = (model: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (modelCategory) {
      removeCustomModel(modelCategory, model);
      // 如果删除的是当前选中的模型，不做任何处理，让用户重新选择
    }
  };

  // 获取选中状态的背景色
  const getSelectedBg = () => {
    switch (variant) {
      case "warning":
        return "bg-warning/20 text-warning border border-warning/30";
      case "info":
        return "bg-info/20 text-info border border-info/30";
      default:
        return "bg-primary/20 text-primary border border-primary/30";
    }
  };

  // 获取按钮主题色
  const getButtonTheme = () => {
    switch (variant) {
      case "warning":
        return "btn-warning";
      case "info":
        return "btn-info";
      default:
        return "btn-primary";
    }
  };

  // 获取头部渐变色
  const getHeaderGradient = () => {
    switch (variant) {
      case "warning":
        return "bg-gradient-to-r from-amber-500 to-orange-500";
      case "info":
        return "bg-gradient-to-r from-cyan-500 to-blue-500";
      default:
        return "bg-gradient-to-r from-purple-500 to-pink-500";
    }
  };

  return createPortal(
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center p-4
        transition-all duration-200 ease-out
        ${isVisible && !isClosing ? "bg-black/60" : "bg-black/0"}
      `}
      onClick={handleClose}
    >
      <div
        className={`
          w-full max-w-xs bg-base-100 rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-200 ease-out
          ${isVisible && !isClosing
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className={`flex items-center justify-between px-4 py-3 ${getHeaderGradient()}`}>
          <span className="text-sm font-medium text-white">{title}</span>
          <button
            className="btn btn-circle btn-ghost btn-sm text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* 预设模型列表 */}
          <div className="space-y-1">
            <label className="text-xs text-base-content/60 mb-1.5 block">预设模型</label>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`
                  w-full px-3 py-2 text-left text-sm rounded-lg
                  flex items-center justify-between
                  transition-colors
                  ${value === opt.value
                    ? getSelectedBg()
                    : "bg-base-200 hover:bg-base-300"
                  }
                `}
                onClick={() => handleSelectPreset(opt.value)}
              >
                <span className="flex flex-col items-start">
                  <span>{opt.label}</span>
                  {opt.label !== opt.value && (
                    <span className="text-xs text-base-content/50">{opt.value}</span>
                  )}
                </span>
                {value === opt.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {/* 用户自定义模型列表 */}
          {allowCustom && customModels.length > 0 && (
            <div className="border-t border-base-300 pt-3 space-y-1">
              <label className="text-xs text-base-content/60 mb-1.5 block">我的模型</label>
              {customModels.map((model) => (
                <div
                  key={model}
                  className={`
                    w-full px-3 py-2 text-left text-sm rounded-lg
                    flex items-center justify-between group
                    transition-colors cursor-pointer
                    ${value === model
                      ? getSelectedBg()
                      : "bg-base-200 hover:bg-base-300"
                    }
                  `}
                  onClick={() => handleSelectPreset(model)}
                >
                  <span className="truncate">{model}</span>
                  <div className="flex items-center gap-1">
                    {value === model && <Check className="w-4 h-4" />}
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-error/20 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleRemoveCustomModel(model, e)}
                      title="删除此模型"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 自定义模型输入 */}
          {allowCustom && (
            <>
              <div className="border-t border-base-300 pt-3">
                <label className="text-xs text-base-content/60 mb-1.5 block">添加自定义模型</label>
                {/* 当前自定义模型显示（如果是临时输入的，不在列表中） */}
                {isCustomModel && value && (
                  <div className="mb-2 px-2 py-1.5 bg-primary/10 rounded-lg text-xs text-primary">
                    当前: {value}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-sm input-bordered flex-1"
                    placeholder={customPlaceholder}
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCustomModelSubmit();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={`btn btn-sm ${getButtonTheme()}`}
                    onClick={handleCustomModelSubmit}
                    disabled={!customModel.trim()}
                  >
                    添加
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end px-4 py-3 bg-base-200/50 border-t border-base-300">
          <span className="text-xs text-base-content/50 mr-auto">
            按 ESC 关闭
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleClose}>
            关闭
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
