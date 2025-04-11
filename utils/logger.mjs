// Centralized logger utility for OLED display drivers
// Provides consistent logging across all modules

/**
 * Creates a logger instance with the specified name
 * @param {string} name - The name to be shown in log messages
 * @returns {Object} Logger instance with debug, info, warn, and error methods
 */
export const createLogger = (name) => {
  // Default log level is info
  let currentLevel = 'info';

  const logger = {
    // Available log levels in order of verbosity
    levels: ['debug', 'info', 'warn', 'error', 'silent'],

    debug: (...args) => currentLevel === 'debug' && console.debug(`[${name} Debug]`, ...args),

    info: (...args) =>
      ['debug', 'info'].includes(currentLevel) && console.info(`[${name} Info]`, ...args),

    warn: (...args) =>
      ['debug', 'info', 'warn'].includes(currentLevel) &&
      console.warn(`[${name} Warning]`, ...args),

    error: (...args) => currentLevel !== 'silent' && console.error(`[${name} Error]`, ...args),

    // Change the current log level
    setLevel: (level) => {
      if (logger.levels.includes(level)) {
        currentLevel = level;
      } else {
        console.warn(`[${name}] Invalid log level: ${level}. Using 'info' instead.`);
        currentLevel = 'info';
      }
    },
  };

  return logger;
};

// Export a default logger for general use
export const logger = createLogger('OLED');

export default logger;
