"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  FileCode,
  Folder,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@acme/ui";
import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { ScrollArea } from "@acme/ui/scroll-area";

import { useFileChangeEvents } from "../hooks/useFileChangeEvents";
import { githubDarkTheme, githubLightTheme } from "../themes";

export interface FileItem {
  name: string;
  type: string;
  path: string;
  children?: FileItem[];
  size?: string;
}

export interface SubscriptionStatus {
  hasSubscription: boolean;
  status: "active" | "inactive" | "cancelled" | string;
}

export interface CodePanelHandlers {
  fetchStructure: () => Promise<FileItem[]>;
  fetchFileContent: (filePath: string) => Promise<string>;
  saveFile: (filePath: string, content: string) => Promise<void>;
}

export interface CodePanelProps extends CodePanelHandlers {
  code?: string;
  currentFile?: string;
  onCodeChange?: (code: string) => void;
  onFileSelect?: (fileName: string) => void;
  projectId?: string;
  isDesktopMode?: boolean;
  onToggleMobileView?: () => void;
  hideHeader?: boolean;
}

function getLanguageFromPath(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    php: "php",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    go: "go",
    rs: "rust",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sh: "bash",
    bash: "bash",
    zsh: "zsh",
    sql: "sql",
    dockerfile: "dockerfile",
    toml: "toml",
    ini: "ini",
    conf: "nginx",
  };

  return languageMap[extension ?? ""] ?? "";
}

function buildHierarchicalStructure(flatFiles: FileItem[]): FileItem[] {
  const root: Record<string, unknown> = {};

  filteredFiles: for (const file of flatFiles) {
    const path = file.path;
    if (
      path.includes("features/element-edition") ||
      path.includes("features/floating-chat") ||
      path === "contexts/AuthContext.tsx"
    ) {
      continue filteredFiles;
    }

    const parts = path.split("/").filter((p) => p !== "");
    let currentLevel = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (index === parts.length - 1) {
        currentLevel[part] = {
          name: part,
          type: file.type,
          path: file.path,
        };
      } else {
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            type: "folder",
            path: currentPath,
            children: {},
          };
        }
        currentLevel = (
          currentLevel[part] as { children: Record<string, unknown> }
        ).children;
      }
    });
  }

  const convertToArray = (obj: Record<string, unknown>): FileItem[] => {
    return Object.entries(obj)
      .map(([, item]) => {
        const typedItem = item as FileItem & {
          children?: Record<string, unknown>;
        };
        if (typedItem.children && typeof typedItem.children === "object") {
          return {
            ...typedItem,
            children: convertToArray(
              typedItem.children as Record<string, unknown>,
            ),
          };
        }
        return typedItem;
      })
      .sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      });
  };

  return convertToArray(root);
}

export const CodePanel = memo(function CodePanel({
  code,
  currentFile,
  onCodeChange,
  onFileSelect,
  projectId,
  hideHeader = false,
  fetchStructure,
  fetchFileContent,
  saveFile,
}: CodePanelProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [fileStructure, setFileStructure] = useState<FileItem[]>([]);
  const [isLoadingStructure, setIsLoadingStructure] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [structureError, setStructureError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const editorInstanceRef = useRef<unknown>(null);

  const canEdit = true;
  const disableErrorSquiggles = true;

  const loadStructure = useCallback(
    async (isRetry = false) => {
      if (!projectId) return false;

      if (!isRetry) {
        setIsLoadingStructure(true);
      }

      try {
        const flatFiles = await fetchStructure();

        if (flatFiles.length > 0) {
          const hierarchical = buildHierarchicalStructure(flatFiles);
          setFileStructure(hierarchical);

          const commonPaths = ["app", "src", "components", "lib"];
          const newExpanded = new Set<string>();
          commonPaths.forEach((p) => {
            if (
              hierarchical.some(
                (item) => item.name === p && item.type === "folder",
              )
            ) {
              newExpanded.add(p);
            }
          });
          setExpandedFolders(newExpanded);

          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
            setIsPolling(false);
          }

          setStructureError(null);
          return true;
        }
        return false;
      } catch (error) {
        if (!isRetry) {
          setStructureError(
            `Failed to fetch file structure: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        return false;
      } finally {
        if (!isRetry) {
          setIsLoadingStructure(false);
        }
      }
    },
    [projectId, fetchStructure],
  );

  const startPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }

    setIsPolling(true);
    let attemptCount = 0;

    void loadStructure();

    const scheduleNextPoll = () => {
      attemptCount++;
      const intervals = [5000, 10000, 20000, 30000];
      const interval =
        intervals[Math.min(attemptCount - 1, intervals.length - 1)];

      pollingTimeoutRef.current = setTimeout(async () => {
        const success = await loadStructure(true);
        if (!success && attemptCount < 10) {
          scheduleNextPoll();
        } else if (success) {
          setIsPolling(false);
        }
      }, interval) as unknown as NodeJS.Timeout;
    };

    scheduleNextPoll();
  }, [loadStructure]);

  const loadFile = useCallback(
    async (filePath: string, onLoadCallback?: () => void) => {
      if (!projectId) return;

      setIsLoadingFile(true);
      try {
        const content = await fetchFileContent(filePath);
        setFileContent(content);
        setSelectedFilePath(filePath);
        onFileSelect?.(filePath);

        if (onLoadCallback) {
          setTimeout(onLoadCallback, 100);
        }
      } catch (error) {
        setFileContent(
          `// Error loading file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      } finally {
        setIsLoadingFile(false);
      }
    },
    [projectId, fetchFileContent, onFileSelect],
  );

  useEffect(() => {
    if (projectId) {
      setStructureError(null);
      setFileStructure([]);
      setFileContent("");
      setSelectedFilePath("");
      startPolling();
    } else if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
      setIsPolling(false);
    }

    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
        setIsPolling(false);
      }
    };
  }, [projectId, startPolling]);

  useFileChangeEvents({
    projectId,
    onFileChange: useCallback(
      (event: { files: { path: string }[] }) => {
        const normalizePath = (p: string) =>
          p.startsWith("./") ? p.slice(2) : p;

        const currentFileChanged =
          selectedFilePath &&
          event.files.some(
            (file) =>
              normalizePath(file.path) === normalizePath(selectedFilePath),
          );

        if (isSavingRef.current && currentFileChanged) return;

        setTimeout(() => {
          if (!isSavingRef.current) {
            void loadStructure();
          }
          if (currentFileChanged && !isSavingRef.current) {
            setEditorKey((prev) => prev + 1);
            void loadFile(selectedFilePath);
          }
        }, 500);
      },
      [selectedFilePath, loadStructure, loadFile],
    ),
    enabled: !!projectId && !!selectedFilePath,
  });

  const handleRefreshClick = useCallback(() => {
    void loadStructure();
  }, [loadStructure]);

  const copyToClipboard = useCallback(() => {
    const contentToCopy = fileContent || code || "";
    void navigator.clipboard.writeText(contentToCopy);
  }, [fileContent, code]);

  const handleSave = useCallback(async () => {
    if (!projectId || !selectedFilePath || !fileContent) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    isSavingRef.current = true;

    try {
      await saveFile(selectedFilePath, fileContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save file",
      );
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    }
  }, [projectId, selectedFilePath, fileContent, saveFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (canEdit && fileContent && selectedFilePath && projectId) {
          void handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, fileContent, selectedFilePath, projectId, handleSave]);

  const toggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }, []);

  const handleFileClick = useCallback(
    (filePath: string) => {
      if (filePath !== selectedFilePath) {
        void loadFile(filePath);
      }
    },
    [selectedFilePath, loadFile],
  );

  const renderFileTree = useCallback(
    (items: FileItem[], depth = 0) => {
      return items.map((item) => {
        const isFolder = item.type === "folder";
        const isFolderExpanded = expandedFolders.has(item.path);
        const isSelected = selectedFilePath === item.path;

        return (
          <div key={item.path}>
            <div
              className={cn(
                "hover:bg-muted flex cursor-pointer items-center rounded px-2 py-1.5 transition-colors",
                isSelected && "bg-muted border-primary border-l-2",
              )}
              style={{ paddingLeft: `${depth * 20 + 8}px` }}
              onClick={() =>
                isFolder ? toggleFolder(item.path) : handleFileClick(item.path)
              }
            >
              <div className="flex min-w-0 flex-1 items-center">
                {isFolder ? (
                  <>
                    {isFolderExpanded ? (
                      <ChevronDown className="mr-1 h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="mr-1 h-4 w-4 flex-shrink-0" />
                    )}
                    <Folder className="text-muted-foreground mr-2 h-4 w-4 flex-shrink-0" />
                  </>
                ) : (
                  <div className="ml-5">
                    <FileCode className="text-muted-foreground mr-2 inline h-4 w-4 flex-shrink-0" />
                  </div>
                )}
                <span className="truncate text-sm">{item.name}</span>
              </div>
            </div>
            {isFolder && isFolderExpanded && item.children && (
              <div>{renderFileTree(item.children, depth + 1)}</div>
            )}
          </div>
        );
      });
    },
    [expandedFolders, selectedFilePath, toggleFolder, handleFileClick],
  );

  const currentContent = fileContent || code || "";
  const currentFilePath = selectedFilePath || currentFile || "";

  return (
    <div className={cn("flex h-full flex-col", !hideHeader && "border-r")}>
      {!hideHeader && (
        <div className="flex h-[50px] items-center border-b p-4">
          <div className="flex w-full items-center justify-between">
            <h2 className="flex items-center font-semibold">
              <FileCode className="mr-2 h-5 w-5" />
              Code Editor
            </h2>
            <div className="flex items-center space-x-2">
              {canEdit && fileContent && selectedFilePath && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              )}
              {projectId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshClick}
                  disabled={isLoadingStructure}
                >
                  <RefreshCw
                    className={cn(
                      "mr-2 h-4 w-4",
                      isLoadingStructure && "animate-spin",
                    )}
                  />
                  Refresh
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="bg-muted/30 w-64 border-r">
          <div className="border-b p-3">
            <div
              className="flex cursor-pointer items-center"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="mr-1 h-4 w-4" />
              ) : (
                <ChevronRight className="mr-1 h-4 w-4" />
              )}
              <Folder className="mr-2 h-4 w-4" />
              <span className="text-sm font-medium">
                {projectId ? "Project Files" : "project"}
              </span>
              {isLoadingStructure && (
                <RefreshCw className="ml-2 h-3 w-3 animate-spin" />
              )}
            </div>
          </div>

          {isExpanded && (
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-2">
                {projectId ? (
                  fileStructure.length > 0 ? (
                    renderFileTree(fileStructure)
                  ) : isPolling || isLoadingStructure ? (
                    <div className="text-muted-foreground p-4 text-center">
                      <RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin" />
                      <p className="text-sm">Loading project files...</p>
                      <p className="mt-1 text-xs">
                        This may take a minute or two
                      </p>
                    </div>
                  ) : structureError ? (
                    <div className="text-muted-foreground p-4 text-center text-xs">
                      <p className="mb-2">Unable to load files</p>
                      <p className="text-xs opacity-70">
                        Files will appear once the project is set up
                      </p>
                    </div>
                  ) : (
                    <div className="text-muted-foreground p-4 text-center">
                      No files found
                    </div>
                  )
                ) : (
                  <div className="text-muted-foreground p-4 text-center text-xs">
                    No project selected
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex flex-1 flex-col">
          <div className="bg-muted/30 border-b p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {currentFilePath || "No file selected"}
                </span>
                {isLoadingFile && (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                )}
              </div>
              <div className="flex items-center space-x-2">
                {saveSuccess && (
                  <Badge variant="default" className="bg-green-500 text-white">
                    Saved!
                  </Badge>
                )}
                {saveError && (
                  <Badge variant="destructive" className="text-xs">
                    Save failed
                  </Badge>
                )}
                {fileContent && selectedFilePath && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {currentContent ? (
              <Editor
                key={editorKey}
                height="100%"
                language={getLanguageFromPath(currentFilePath)}
                value={currentContent}
                onChange={(value) => {
                  if (canEdit) {
                    if (fileContent) {
                      setFileContent(value ?? "");
                    } else {
                      onCodeChange?.(value ?? "");
                    }
                  }
                }}
                beforeMount={(monaco) => {
                  monaco.editor.defineTheme(
                    "github-light",
                    githubLightTheme as Parameters<
                      typeof monaco.editor.defineTheme
                    >[1],
                  );
                  monaco.editor.defineTheme(
                    "github-dark",
                    githubDarkTheme as Parameters<
                      typeof monaco.editor.defineTheme
                    >[1],
                  );

                  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
                    {
                      noSemanticValidation: disableErrorSquiggles,
                      noSyntaxValidation: disableErrorSquiggles,
                      noSuggestionDiagnostics: disableErrorSquiggles,
                    },
                  );
                  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(
                    {
                      noSemanticValidation: disableErrorSquiggles,
                      noSyntaxValidation: disableErrorSquiggles,
                      noSuggestionDiagnostics: disableErrorSquiggles,
                    },
                  );
                }}
                onMount={(editor, monaco) => {
                  editorInstanceRef.current = editor;

                  editor.addCommand(
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                    () => {
                      window.dispatchEvent(
                        new KeyboardEvent("keydown", {
                          key: "s",
                          code: "KeyS",
                          metaKey: true,
                          ctrlKey: true,
                          bubbles: true,
                          cancelable: true,
                        }),
                      );
                    },
                  );
                }}
                options={{
                  readOnly: !canEdit,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: "on",
                  wordWrap: "on",
                  automaticLayout: true,
                  glyphMargin: true,
                  folding: true,
                  renderValidationDecorations: disableErrorSquiggles
                    ? "off"
                    : "on",
                }}
                theme={theme === "light" ? "github-light" : "github-dark"}
              />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center p-4">
                <div className="text-center">
                  {projectId &&
                  (isPolling || isLoadingStructure) &&
                  fileStructure.length === 0 ? (
                    <>
                      <p className="mb-2 text-lg font-medium">
                        Generating code...
                      </p>
                      <p className="text-sm">
                        Setting up your project files. This may take a minute or
                        two.
                      </p>
                    </>
                  ) : (
                    <>
                      <FileCode className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p className="mb-2 text-lg font-medium">
                        {projectId
                          ? "Select a file to view"
                          : "No code generated yet"}
                      </p>
                      <p className="text-sm">
                        {projectId
                          ? "Click on any file in the explorer to view its contents"
                          : "Start a conversation with the AI to generate code"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
