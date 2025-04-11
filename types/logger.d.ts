// Type definitions for oled-rpi-i2c-bus-async logger utility
// Project: https://github.com/grevelle/oled-rpi-i2c-bus-async
// Definitions by: GitHub Copilot

declare module '../utils/logger.mjs' {
  /**
   * Logger level type
   */
  export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

  /**
   * Logger instance interface
   */
  export interface Logger {
    /**
     * Available log levels in order of verbosity
     */
    levels: LogLevel[];

    /**
     * Log a debug message
     * @param args - Message and optional arguments to log
     */
    debug(...args: any[]): void;

    /**
     * Log an info message
     * @param args - Message and optional arguments to log
     */
    info(...args: any[]): void;

    /**
     * Log a warning message
     * @param args - Message and optional arguments to log
     */
    warn(...args: any[]): void;

    /**
     * Log an error message
     * @param args - Message and optional arguments to log
     */
    error(...args: any[]): void;

    /**
     * Change the current log level
     * @param level - The log level to set
     */
    setLevel(level: LogLevel): void;
  }

  /**
   * Creates a logger instance with the specified name
   * @param name - The name to be shown in log messages
   * @returns Logger instance with debug, info, warn, and error methods
   */
  export function createLogger(name: string): Logger;

  /**
   * Export a default logger for general use
   */
  export const logger: Logger;

  export default logger;
}