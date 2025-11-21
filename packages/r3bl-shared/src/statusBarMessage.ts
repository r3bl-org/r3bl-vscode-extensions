import * as vscode from 'vscode';

export enum StatusBarMessageType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error'
}

export type FeedbackMechanism = 'none' | 'notification' | 'statusbar';

export class StatusBarMessage {
  private static statusBarItem: vscode.StatusBarItem | undefined;
  private static hideTimeout: NodeJS.Timeout | undefined;

  // Default durations (milliseconds) for each message type
  private static readonly DEFAULT_DURATIONS = {
    success: 3000,
    info: 3000,
    warning: 4000,
    error: 5000
  };

  /**
   * Show a dismissable feedback message using the user's preferred mechanism
   * Duration is automatically determined by message type and can be customized via settings
   * @param message The message to display
   * @param type The type of message (affects icon, color, and duration)
   */
  static show(
    message: string,
    type: StatusBarMessageType = StatusBarMessageType.Info
  ): void {
    // Read user preferences (shared across all R3BL extensions)
    const config = vscode.workspace.getConfiguration('r3bl');
    const feedbackMechanism = config.get<FeedbackMechanism>(
      'transientFeedbackMechanism',
      'statusbar'
    );

    // Handle based on user preference
    switch (feedbackMechanism) {
      case 'none':
        // Don't show any feedback
        return;

      case 'notification':
        // Use classic notification behavior
        this.showAsNotification(message, type);
        break;

      case 'statusbar':
      default:
        // Use status bar (default)
        const maxLength = config.get<number>(
          'statusbarMessageMaxLength',
          50
        );
        const durationMs = this.getDuration(type);
        this.showInStatusBar(message, type, durationMs, maxLength);
        break;
    }
  }

  /**
   * Get duration for a message type from config or use default
   */
  private static getDuration(type: StatusBarMessageType): number {
    const config = vscode.workspace.getConfiguration('r3bl.statusbarMessage');

    switch (type) {
      case StatusBarMessageType.Success:
        return config.get<number>('successDuration', this.DEFAULT_DURATIONS.success);
      case StatusBarMessageType.Info:
        return config.get<number>('infoDuration', this.DEFAULT_DURATIONS.info);
      case StatusBarMessageType.Warning:
        return config.get<number>('warningDuration', this.DEFAULT_DURATIONS.warning);
      case StatusBarMessageType.Error:
        return config.get<number>('errorDuration', this.DEFAULT_DURATIONS.error);
      default:
        return this.DEFAULT_DURATIONS.info;
    }
  }

  /**
   * Show message as a classic VSCode notification
   */
  private static showAsNotification(message: string, type: StatusBarMessageType): void {
    switch (type) {
      case StatusBarMessageType.Error:
        vscode.window.showErrorMessage(message);
        break;
      case StatusBarMessageType.Warning:
        vscode.window.showWarningMessage(message);
        break;
      case StatusBarMessageType.Success:
      case StatusBarMessageType.Info:
      default:
        vscode.window.showInformationMessage(message);
        break;
    }
  }

  /**
   * Show message in the status bar with auto-dismiss
   */
  private static showInStatusBar(
    message: string,
    type: StatusBarMessageType,
    durationMs: number,
    maxLength: number
  ): void {
    // Clear any existing timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    // Create status bar item if it doesn't exist
    if (!this.statusBarItem) {
      this.statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
      );
    }

    // Truncate message if needed
    const displayMessage = this.truncateMessage(message, maxLength);

    // Set icon based on type
    const icon = this.getIcon(type);
    const color = this.getColor(type);

    this.statusBarItem.text = `${icon} ${displayMessage}`;
    this.statusBarItem.color = color;
    this.statusBarItem.tooltip = message; // Full message in tooltip
    this.statusBarItem.show();

    // Auto-hide after duration
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, durationMs);
  }

  /**
   * Truncate message to fit within max length
   */
  private static truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Manually hide the status bar message
   */
  static hide(): void {
    if (this.statusBarItem) {
      this.statusBarItem.hide();
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }
  }

  /**
   * Dispose of the status bar item (call on extension deactivation)
   */
  static dispose(): void {
    this.hide();
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
      this.statusBarItem = undefined;
    }
  }

  private static getIcon(type: StatusBarMessageType): string {
    switch (type) {
      case StatusBarMessageType.Success:
        return '$(check)';
      case StatusBarMessageType.Warning:
        return '$(warning)';
      case StatusBarMessageType.Error:
        return '$(error)';
      case StatusBarMessageType.Info:
      default:
        return '$(info)';
    }
  }

  private static getColor(type: StatusBarMessageType): string | vscode.ThemeColor | undefined {
    switch (type) {
      case StatusBarMessageType.Error:
        return new vscode.ThemeColor('errorForeground');
      case StatusBarMessageType.Warning:
        return new vscode.ThemeColor('editorWarning.foreground');
      case StatusBarMessageType.Success:
        return new vscode.ThemeColor('terminal.ansiGreen');
      default:
        return undefined; // Use default color
    }
  }
}
