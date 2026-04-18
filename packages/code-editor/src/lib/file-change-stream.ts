import type { FileChangeEvent } from '@react-native-vibe-code/sandbox'

export class FileChangeStream {
  private connections = new Map<string, Set<WritableStreamDefaultWriter<Uint8Array>>>()
  private encoder = new TextEncoder()

  /**
   * Add a client connection to receive file change events for a project
   */
  addConnection(projectId: string, writer: WritableStreamDefaultWriter<Uint8Array>): void {
    if (!this.connections.has(projectId)) {
      this.connections.set(projectId, new Set())
    }
    this.connections.get(projectId)!.add(writer)
  }

  /**
   * Remove a client connection
   */
  removeConnection(projectId: string, writer: WritableStreamDefaultWriter<Uint8Array>): void {
    const connections = this.connections.get(projectId)
    if (connections) {
      connections.delete(writer)
      if (connections.size === 0) {
        this.connections.delete(projectId)
      }
    }
  }

  /**
   * Broadcast file change event to all connected clients for a project
   */
  async broadcastFileChange(event: FileChangeEvent): Promise<void> {
    const connections = this.connections.get(event.projectId)
    if (!connections || connections.size === 0) {
      return
    }

    const eventData = JSON.stringify(event)
    const sseData = `data: ${eventData}\n\n`
    const encodedData = this.encoder.encode(sseData)

    // Send to all connected clients
    const promises = Array.from(connections).map(async (writer) => {
      try {
        await writer.write(encodedData)
      } catch (error) {
        console.error('[FileChangeStream] Error writing to connection:', error)
        // Remove failed connection
        connections.delete(writer)
      }
    })

    await Promise.allSettled(promises)
  }

  /**
   * Get the number of active connections for a project
   */
  getConnectionCount(projectId: string): number {
    return this.connections.get(projectId)?.size ?? 0
  }

  /**
   * Get all projects with active connections
   */
  getActiveProjects(): string[] {
    return Array.from(this.connections.keys())
  }
}

// Global instance
export const globalFileChangeStream = new FileChangeStream()
