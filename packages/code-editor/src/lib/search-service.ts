import { fileCache, type SearchResult } from "./file-cache";

export interface BulkFile {
	path: string;
	content: string;
	size: number;
	lastModified: number;
}

export type BulkFilesFetcher = (projectId: string) => Promise<BulkFile[]>;
export type SingleFileFetcher = (
	projectId: string,
	filePath: string,
) => Promise<string>;

export interface SearchOptions {
	isRegex?: boolean;
	isCaseSensitive?: boolean;
	contextLines?: number;
	maxResults?: number;
}

function normalizePath(path: string): string {
	return path.startsWith("./") ? path.slice(2) : path;
}

class SearchService {
	private projectId: string | null = null;
	private isInitialized = false;
	private isCaching = false;
	private refreshedProjects = new Set<string>();

	async initialize(projectId: string): Promise<void> {
		if (this.projectId === projectId && this.isInitialized) {
			return;
		}

		this.projectId = projectId;
		await fileCache.init();
		this.isInitialized = true;
	}

	async cacheProjectFiles(
		projectId: string,
		fetchBulkFiles: BulkFilesFetcher,
		forceRefresh = false,
	): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize(projectId);
		}

		if (this.isCaching) {
			return;
		}

		this.isCaching = true;

		try {
			let shouldForce = forceRefresh;
			if (!this.refreshedProjects.has(projectId) && !shouldForce) {
				shouldForce = true;
				this.refreshedProjects.add(projectId);
			}

			if (shouldForce) {
				await this.clearProjectCache(projectId);
			}

			if (!shouldForce) {
				const existingFiles = await fileCache.getAllProjectFiles(projectId);
				if (existingFiles.length > 0) {
					return;
				}
			}

			const files = await fetchBulkFiles(projectId);

			if (files.length === 0) {
				return;
			}

			const filesToCache = files.map((file) => ({
				projectId,
				filePath: normalizePath(file.path),
				content: file.content,
				lastModified: file.lastModified,
				size: file.size,
			}));

			await fileCache.cacheMultipleFiles(filesToCache);
		} finally {
			this.isCaching = false;
		}
	}

	async searchInProject(
		projectId: string,
		query: string,
		fetchBulkFiles: BulkFilesFetcher,
		options: SearchOptions = {},
	): Promise<SearchResult[]> {
		if (!this.isInitialized) {
			await this.initialize(projectId);
		}

		if (!query.trim()) {
			return [];
		}

		const { isRegex = false, contextLines = 2, maxResults = 500 } = options;

		await this.cacheProjectFiles(projectId, fetchBulkFiles);

		let results = await fileCache.searchInProject(
			projectId,
			query,
			isRegex,
			contextLines,
		);

		results.sort((a, b) => {
			if (a.filePath !== b.filePath) {
				return a.filePath.localeCompare(b.filePath);
			}
			return a.lineNumber - b.lineNumber;
		});

		if (results.length > maxResults) {
			results = results.slice(0, maxResults);
		}

		return results;
	}

	async getFileContent(
		projectId: string,
		filePath: string,
	): Promise<string | null> {
		if (!this.isInitialized) {
			await this.initialize(projectId);
		}

		const cachedFile = await fileCache.getFile(projectId, filePath);
		return cachedFile?.content ?? null;
	}

	async clearProjectCache(projectId: string): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize(projectId);
		}

		await fileCache.clearProject(projectId);
	}

	async getCacheInfo(): Promise<{ totalFiles: number; totalSize: number }> {
		if (!this.isInitialized) {
			return { totalFiles: 0, totalSize: 0 };
		}

		return fileCache.getStorageInfo();
	}

	isCachingFiles(): boolean {
		return this.isCaching;
	}

	async updateChangedFiles(
		projectId: string,
		changedFiles: { path: string; content?: string }[],
		fetchBulkFiles: BulkFilesFetcher,
		fetchSingleFile: SingleFileFetcher,
	): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize(projectId);
		}

		if (changedFiles.length > 10) {
			await this.cacheProjectFiles(projectId, fetchBulkFiles, true);
			return;
		}

		const updatePromises = changedFiles.map(async (fileChange) => {
			const path = normalizePath(fileChange.path);

			if (fileChange.content !== undefined) {
				await fileCache.cacheFile({
					projectId,
					filePath: path,
					content: fileChange.content,
					lastModified: Date.now(),
					size: fileChange.content.length,
				});
				return;
			}

			const content = await fetchSingleFile(projectId, path);
			await fileCache.cacheFile({
				projectId,
				filePath: path,
				content,
				lastModified: Date.now(),
				size: content.length,
			});
		});

		await Promise.all(updatePromises);
	}

	async removeDeletedFiles(
		projectId: string,
		deletedFiles: string[],
	): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize(projectId);
		}

		for (const filePath of deletedFiles) {
			await fileCache.removeFile(projectId, filePath);
		}
	}

	async forceRefreshCache(
		projectId: string,
		fetchBulkFiles: BulkFilesFetcher,
	): Promise<void> {
		this.refreshedProjects.delete(projectId);
		await this.cacheProjectFiles(projectId, fetchBulkFiles, true);
	}

	async clearAllCaches(): Promise<void> {
		this.refreshedProjects.clear();
		await fileCache.clearAllCache();
	}
}

export const searchService = new SearchService();
