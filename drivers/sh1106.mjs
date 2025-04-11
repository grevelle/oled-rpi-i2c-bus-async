// SH1106 OLED driver implementation
import BaseOLED from './base-oled.mjs';
import { createLogger } from '../utils/logger.mjs';

class SH1106 extends BaseOLED {
  constructor(i2c, opts) {
    super(i2c, opts);

    // Create driver-specific logger
    this.logger = createLogger('SH1106');

    // Set logger level if provided
    if (opts?.logLevel) {
      this.logger.setLevel(opts.logLevel);
    }

    // SH1106 specific command definitions
    this.SET_START_LINE = 0x40;
    this.CHARGE_PUMP = 0xad;
    this.COLUMN_LOW_START_ADDR = 0x02;
    this.COLUMN_HIGH_START_ADDR = 0x10;
    this.PAGE_ADDR = 0xb0;

    const config = {
      '128x32': {
        multiplex: 0x1f,
        compins: 0x02,
        coloffset: 0x02,
      },
      '128x64': {
        multiplex: 0x3f,
        compins: 0x12,
        coloffset: 0x02,
      },
      '96x16': {
        multiplex: 0x0f,
        compins: 0x02,
        coloffset: 0x02,
      },
    };

    const screenSize = `${this.WIDTH}x${this.HEIGHT}`;
    this.screenConfig = config[screenSize];

    // Initialize the display
    this._initialise();
  }

  /* ##################################################################################################
   * SH1106 specific implementations
   * ##################################################################################################
   */

  // SH1106 does not support scrolling
  startScroll = async (dir, start, stop) => {
    this.logger.warn('SH1106 does not support scrolling');
  };

  // SH1106 does not support scrolling
  stopScroll = async () => {
    this.logger.warn('SH1106 does not support scrolling');
  };

  // Draw a column of a page on the SH1106 with batch commands
  drawPageCol = async (page, col, byte) => {
    // Wait for oled to be ready
    await this._waitUntilReady();

    // Set the start and end byte locations for oled display update
    const bufferIndex = col + page * this.WIDTH;
    this.buffer[bufferIndex] = byte;

    // Ensure that column is only 0..127.
    col &= 0x7f;
    col += this.screenConfig.coloffset; // Column Bias for a SH1106.

    const lowAddress = col & 0x0f;
    const highAddress = this.COLUMN_HIGH_START_ADDR | (col >>> 4);

    // Prepare command sequence
    const displaySeq = [this.PAGE_ADDR + page, lowAddress, highAddress];

    // Send commands as a batch
    await this._transferBatch('cmd', displaySeq);

    // Send data
    await this._transfer('data', this.buffer[bufferIndex]);
  };

  // Send the entire framebuffer to the oled
  update = async () => {
    // Wait for oled to be ready
    await this._waitUntilReady();

    // Set the start and end byte locations for oled display update
    for (let pageIdx = 0; pageIdx < this.MAX_PAGE_COUNT; pageIdx++) {
      // Prepare command sequence for this page
      const displaySeq = [
        this.PAGE_ADDR + pageIdx,
        this.COLUMN_LOW_START_ADDR,
        this.COLUMN_HIGH_START_ADDR,
      ];

      // Send intro sequence as a batch instead of separately
      await this._transferBatch('cmd', displaySeq);

      const start = pageIdx * this.WIDTH;
      const end = start + this.WIDTH;

      // Get the page buffer - optimize with subarray if available
      let pagedBuffer =
        typeof this.buffer.subarray === 'function'
          ? this.buffer.subarray(start, end)
          : this.buffer.slice(start, end);

      // Send the page data in one batch instead of byte by byte
      await this._transferBatch('data', pagedBuffer);
    }
  };

  /* ##################################################################################################
   * Implementation of required base methods
   * ##################################################################################################
   */

  // Initialize the SH1106 display with optimized batch commands
  _initialise = async () => {
    try {
      // Sequence of bytes to initialise with - now sent as a single batch
      const initSeq = [
        this.DISPLAY_OFF,
        this.SET_DISPLAY_CLOCK_DIV,
        0x80,
        this.SET_MULTIPLEX,
        this.screenConfig.multiplex, // Set dynamically based on screen size
        this.SET_DISPLAY_OFFSET,
        0x00,
        this.SET_START_LINE,
        this.CHARGE_PUMP,
        0x8b, // Charge pump val
        this.SEG_REMAP, // Screen orientation
        this.COM_SCAN_DEC, // Screen orientation - change to INC to flip
        this.SET_COM_PINS,
        this.screenConfig.compins, // Com pins val sets dynamically for screen size
        this.SET_CONTRAST,
        0x80, // Contrast val
        this.SET_PRECHARGE,
        0x22, // Precharge val
        this.SET_VCOM_DETECT,
        0x35, // VCOM detect
        this.NORMAL_DISPLAY,
        this.DISPLAY_ON,
      ];

      // Write init seq commands all at once instead of individually
      await this._transferBatch('cmd', initSeq);

      this.logger.debug('Display initialized successfully');
    } catch (err) {
      this.logger.error('Error initializing display:', err);
      throw err;
    }
  };

  // Update dirty bytes - optimized version with page grouping and batch commands
  _updateDirtyBytes = async (dirtyByteArray) => {
    try {
      const dirtyByteArrayLen = dirtyByteArray.length;

      // If there are no dirty bytes, nothing to do
      if (dirtyByteArrayLen === 0) {
        return;
      }

      // Check if full update would be more efficient
      if (dirtyByteArrayLen > this.buffer.length / 7) {
        // More efficient to do a full update
        await this.update();
        // Now that all bytes are synced, reset dirty state
        this.dirtyBytes = [];
        return;
      }

      // Wait for display to be ready
      await this._waitUntilReady();

      // Group dirty bytes by page for more efficient updates
      const pageGroups = new Map();

      // Group bytes by page
      for (let i = 0; i < dirtyByteArrayLen; i++) {
        const byteIndex = dirtyByteArray[i];
        const page = Math.floor(byteIndex / this.WIDTH);
        const col = Math.floor(byteIndex % this.WIDTH);

        if (!pageGroups.has(page)) {
          pageGroups.set(page, []);
        }

        pageGroups.get(page).push({
          col,
          byteIndex,
        });
      }

      // Now update each page's dirty bytes
      for (const [page, bytes] of pageGroups.entries()) {
        // Sort by column for sequential access
        bytes.sort((a, b) => a.col - b.col);

        // Optimize for consecutive columns by grouping them
        let currentStart = null;
        let currentEnd = null;
        let currentData = [];

        const flushCurrentRange = async () => {
          if (currentStart !== null) {
            // Compute column addresses for SH1106
            let adjustedStart = currentStart & 0x7f;
            adjustedStart += this.screenConfig.coloffset;

            // Page command
            await this._transfer('cmd', this.PAGE_ADDR + page);

            // Column start address (low and high nibbles)
            const lowStartAddress = adjustedStart & 0x0f;
            const highStartAddress = this.COLUMN_HIGH_START_ADDR | (adjustedStart >>> 4);

            // Send the column address commands
            await this._transferBatch('cmd', [lowStartAddress, highStartAddress]);

            // Send all data bytes for this range in a batch
            await this._transferBatch('data', currentData);

            // Reset tracking variables
            currentStart = null;
            currentEnd = null;
            currentData = [];
          }
        };

        // Process each byte
        for (let i = 0; i < bytes.length; i++) {
          const { col, byteIndex } = bytes[i];

          // If this is a new range or not consecutive with previous column
          if (currentStart === null || col !== currentEnd + 1) {
            // Flush the current range if any
            await flushCurrentRange();

            // Start a new range
            currentStart = col;
          }

          // Update the end of the range
          currentEnd = col;

          // Add data to the current batch
          currentData.push(this.buffer[byteIndex]);
        }

        // Flush any remaining range
        await flushCurrentRange();
      }

      // Reset dirty bytes
      this.dirtyBytes = [];
    } catch (err) {
      this.logger.error('Error updating dirty bytes:', err);
      throw err;
    }
  };
}

export default SH1106;
