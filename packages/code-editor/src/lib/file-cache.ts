/**
 * IndexedDB-based file cache for storing project file contents
 * Provides fast client-side search capabilities
 */

export interface CachedFile {
  id?: number
  projectId: string
  filePath: string
  content: string
  lastModified: number
  size: number
}

export interface SearchResult {
  filePath: string
  lineNumber: number
  columnStart: number
  columnEnd: number
  lineContent: string
  contextBefore: string[]
  contextAfter: string[]
}

class FileCache {
  private dbName = 'fileCache'
  private version = 2 // Increment version to force database upgrade and clear old data
  private storeName = 'files'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Clear existing store if it exists (force fresh start)
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName)
        }

        const store = db.createObjectStore(this.storeName, {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('projectId', 'projectId', { unique: false })
        store.createIndex('filePath', 'filePath', { unique: false })
        store.createIndex('projectFilePath', ['projectId', 'filePath'], {
          unique: true,
        })
      }
    })
  }

  async cacheFile(file: Omit<CachedFile, 'id'>): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('projectFilePath')

      // First, try to find existing file
      const getRequest = index.get([file.projectId, file.filePath])

      getRequest.onsuccess = () => {
        const existing = getRequest.result
        if (existing) {
          // Update existing file
          const updatedFile: CachedFile = {
            ...existing,
            content: file.content,
            lastModified: file.lastModified,
            size: file.size,
          }
          const putRequest = store.put(updatedFile)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          // Add new file
          const addRequest = store.add(file)
          addRequest.onsuccess = () => resolve()
          addRequest.onerror = () => reject(addRequest.error)
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async cacheMultipleFiles(files: Omit<CachedFile, 'id'>[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      let processed = 0
      let errors = 0

      transaction.oncomplete = () => {
        resolve()
      }
      transaction.onerror = () => {
        reject(transaction.error)
      }
      transaction.onabort = () => {
        reject(transaction.error)
      }

      if (files.length === 0) {
        return
      }

      for (const file of files) {
        const index = store.index('projectFilePath')
        const getRequest = index.get([file.projectId, file.filePath])

        getRequest.onsuccess = () => {
          try {
            const existing = getRequest.result
            if (existing) {
              const updatedFile: CachedFile = {
                ...existing,
                content: file.content,
                lastModified: file.lastModified,
                size: file.size,
              }
              const putRequest = store.put(updatedFile)
              putRequest.onerror = () => {
                errors++
              }
            } else {
              const addRequest = store.add(file)
              addRequest.onerror = () => {
                errors++
              }
            }
            processed++
          } catch {
            errors++
          }
        }

        getRequest.onerror = () => {
          errors++
        }
      }
    })
  }

  async getFile(projectId: string, filePath: string): Promise<CachedFile | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('projectFilePath')
      const request = index.get([projectId, filePath])

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllProjectFiles(projectId: string): Promise<CachedFile[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('projectId')
      const request = index.getAll(projectId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async searchInProject(
    projectId: string,
    query: string,
    isRegex: boolean = false,
    contextLines: number = 2
  ): Promise<SearchResult[]> {
    const files = await this.getAllProjectFiles(projectId)
    const results: SearchResult[] = []

    for (const file of files) {
      const fileResults = this.searchInFile(
        file.content,
        file.filePath,
        query,
        isRegex,
        contextLines
      )
      results.push(...fileResults)
    }

    return results
  }

  private searchInFile(
    content: string,
    filePath: string,
    query: string,
    isRegex: boolean,
    contextLines: number
  ): SearchResult[] {
    const lines = content.split('\n')
    const results: SearchResult[] = []

    try {
      const searchPattern = isRegex ? new RegExp(query, 'gi') : null

      lines.forEach((line, lineIndex) => {
        const matches: RegExpExecArray[] = []

        if (isRegex && searchPattern) {
          let match
          while ((match = searchPattern.exec(line)) !== null) {
            matches.push(match)
            if (!searchPattern.global) break
          }
        } else {
          // Simple string search
          const lowerLine = line.toLowerCase()
          const lowerQuery = query.toLowerCase()
          let index = 0
          while ((index = lowerLine.indexOf(lowerQuery, index)) !== -1) {
            matches.push({
              0: line.substring(index, index + lowerQuery.length),
              index,
              input: line,
              groups: undefined,
              length: 1,
            } as RegExpExecArray)
            index += lowerQuery.length
          }
        }

        matches.forEach((match) => {
          if (match.index !== undefined) {
            const contextBefore = lines
              .slice(Math.max(0, lineIndex - contextLines), lineIndex)
              .filter((_, i, arr) => i < arr.length)

            const contextAfter = lines
              .slice(lineIndex + 1, lineIndex + 1 + contextLines)
              .filter((_, i, arr) => i < arr.length)

            results.push({
              filePath,
              lineNumber: lineIndex + 1, // 1-based line numbers
              columnStart: match.index,
              columnEnd: match.index + match[0].length,
              lineContent: line,
              contextBefore,
              contextAfter,
            })
          }
        })
      })
    } catch (error) {
      console.error('Search error in file', filePath, ':', error)
    }

    return results
  }

  async removeFile(projectId: string, filePath: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('projectFilePath')
      const request = index.getKey([projectId, filePath])

      request.onsuccess = () => {
        const key = request.result
        if (key) {
          const deleteRequest = store.delete(key)
          deleteRequest.onsuccess = () => resolve()
          deleteRequest.onerror = () => reject(deleteRequest.error)
        } else {
          resolve() // File not found, consider it successful
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async clearProject(projectId: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('projectId')
      const request = index.openCursor(projectId)

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          store.delete(cursor.primaryKey)
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  async clearAllCache(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getStorageInfo(): Promise<{ totalFiles: number; totalSize: number }> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const files = request.result as CachedFile[]
        const totalFiles = files.length
        const totalSize = files.reduce((sum, file) => sum + file.size, 0)
        resolve({ totalFiles, totalSize })
      }

      request.onerror = () => reject(request.error)
    })
  }

  async debugCacheContents(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const files = request.result as CachedFile[]

        // Group by project
        files.reduce((acc, file) => {
          if (!acc[file.projectId]) acc[file.projectId] = []
          acc[file.projectId].push(file.filePath)
          return acc
        }, {} as Record<string, string[]>)

        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }
}

// Export singleton instance
export const fileCache = new FileCache()
