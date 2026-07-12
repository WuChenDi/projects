// Undo/redo command-bus scaffold. Ported from bycut; wired fully in FEAT-027.
// FEAT-026 mutates state through the managers directly, but the bus exists so
// interactions can be routed through it without reshaping the core.

export interface Command {
  execute(): boolean
  undo(): void
  redo(): void
}

export class CommandManager {
  private history: Command[] = []
  private redoStack: Command[] = []

  execute({ command }: { command: Command }): Command {
    const changed = command.execute()
    if (changed) {
      this.history.push(command)
      this.redoStack = []
    }
    return command
  }

  undo(): void {
    const command = this.history.pop()
    if (!command) return
    command.undo()
    this.redoStack.push(command)
  }

  redo(): void {
    const command = this.redoStack.pop()
    if (!command) return
    command.redo()
    this.history.push(command)
  }

  canUndo(): boolean {
    return this.history.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear(): void {
    this.history = []
    this.redoStack = []
  }
}
