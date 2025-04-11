// SSD1306 OLED driver implementation
import BaseOLED from './base-oled.mjs';
import { createLogger } from '../utils/logger.mjs';

class SSD1306 extends BaseOLED {
  constructor(i2c, opts) {
    super(i2c, opts);
    
    // Create driver-specific logger
    this.logger = createLogger('SSD1306');
    
    // Set logger level if provided
    if (opts?.logLevel) {
      this.logger.setLevel(opts.logLevel);
    }

    // SSD1306 specific command definitions
    this.SET_START_LINE = 0x00;
    this.CHARGE_PUMP = 0x8d;
    this.MEMORY_MODE = 0x20;
    this.SEG_REMAP = 0xa1;
    this.COM_SCAN_DEC = 0xc8;
    this.COM_SCAN_INC = 0xc0;
    this.SET_COM_PINS = 0xda;
    this.COLUMN_ADDR = 0x21;
    this.PAGE_ADDR = 0x22;
    this.ACTIVATE_SCROLL = 0x2f;
    this.DEACTIVATE_SCROLL = 0x2e;
    this.SET_VERTICAL_SCROLL_AREA = 0xa3;
    this.RIGHT_HORIZONTAL_SCROLL = 0x26;
    this.LEFT_HORIZONTAL_SCROLL = 0x27;
    this.VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL = 0x29;
    this.VERTICAL_AND_LEFT_HORIZONTAL_SCROLL = 0x02;

    const config = {
      '128x32': {
        multiplex: 0x1f,
        compins: 0x02,
        coloffset: 0,
      },
      '128x64': {
        multiplex: 0x3f,
        compins: 0x12,
        coloffset: 0,
      },
      '96x16': {
        multiplex: 0x0f,
        compins: 0x02,
        coloffset: 0,
      },
    };

    const screenSize = `${this.WIDTH}x${this.HEIGHT}`;
    this.screenConfig = config[screenSize];
    
    // Initialize the display
    this._initialise();
  }

  /* ##################################################################################################
   * SSD1306 specific implementations
   * ##################################################################################################
   */

  // Activate scrolling for rows start through stop using batch commands
  startScroll = async (dir, start, stop) => {
    let cmdSeq = [];

    switch (dir) {
      case 'right':
        cmdSeq.push(this.RIGHT_HORIZONTAL_SCROLL);
        break;
      case 'left':
        cmdSeq.push(this.LEFT_HORIZONTAL_SCROLL);
        break;
      // TODO: left diag and right diag not working yet
      case 'left diagonal':
        cmdSeq.push(
          this.SET_VERTICAL_SCROLL_AREA,
          0x00,
          this.VERTICAL_AND_LEFT_HORIZONTAL_SCROLL,
          this.HEIGHT
        );
        break;
      case 'right diagonal':
        cmdSeq.push(
          this.SET_VERTICAL_SCROLL_AREA,
          0x00,
          this.VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL,
          this.HEIGHT
        );
        break;
    }

    await this._waitUntilReady();

    cmdSeq.push(
      0x00,
      start,
      0x00,
      stop,
      // TODO: these need to change when diagonal
      0x00,
      0xff,
      this.ACTIVATE_SCROLL
    );

    // Send all scroll commands in a single batch instead of individually
    await this._transferBatch('cmd', cmdSeq);
  };

  // Stop scrolling display contents
  stopScroll = async () => {
    await this._transfer('cmd', this.DEACTIVATE_SCROLL);
  };

  // Send the entire framebuffer to the oled
  update = async () => {
    // Wait for oled to be ready
    await this._waitUntilReady();

    // Set the start and end byte locations for oled display update
    const displaySeq = [
      this.COLUMN_ADDR,
      this.screenConfig.coloffset,
      this.screenConfig.coloffset + this.WIDTH - 1, // column start and end address
      this.PAGE_ADDR,
      0,
      this.HEIGHT / 8 - 1, // page start and end address
    ];

    // Send intro sequence all at once instead of individually
    await this._transferBatch('cmd', displaySeq);

    // Write buffer data
    const bufferToSend = Buffer.concat([Buffer.from([0x40]), this.buffer]);
    await this.wire.i2cWrite(this.ADDRESS, bufferToSend.length, bufferToSend);
  };

  /* ##################################################################################################
   * Implementation of required base methods
   * ##################################################################################################
   */

  // Optimize display initialization with batch commands for better efficiency
  _initialise = async () => {
    try {
      // Initial commands that must be sent sequentially
      const initialSeq = [
        this.DISPLAY_OFF,
        this.SET_DISPLAY_CLOCK_DIV,
        0x80
      ];
      
      // Send initial commands as a batch
      await this._transferBatch('cmd', initialSeq);
      
      // Group 1 of commands - send in batch instead of parallel
      const group1 = [
        this.SET_MULTIPLEX,
        this.screenConfig.multiplex,
        this.SET_DISPLAY_OFFSET,
        0x00,
        this.SET_START_LINE
      ];
      await this._transferBatch('cmd', group1);
      
      // Group 2 of commands - send in batch instead of parallel
      const group2 = [
        this.CHARGE_PUMP,
        0x14,
        this.MEMORY_MODE,
        0x00
      ];
      await this._transferBatch('cmd', group2);
      
      // Group 3 of commands - send in batch instead of parallel
      const group3 = [
        this.SEG_REMAP,
        this.COM_SCAN_DEC,
        this.SET_COM_PINS,
        this.screenConfig.compins
      ];
      await this._transferBatch('cmd', group3);
      
      // Group 4 of commands - send in batch instead of parallel
      const group4 = [
        this.SET_CONTRAST,
        0x8f,
        this.SET_PRECHARGE,
        0xf1
      ];
      await this._transferBatch('cmd', group4);
      
      // Final commands
      const finalSeq = [
        this.SET_VCOM_DETECT,
        0x40,
        this.DISPLAY_ALL_ON_RESUME,
        this.NORMAL_DISPLAY,
        this.DISPLAY_ON
      ];
      
      // Send final commands as a batch
      await this._transferBatch('cmd', finalSeq);
      
      this.logger.debug('Display initialized successfully');
    } catch (err) {
      this.logger.error('Error initializing display:', err);
      throw err;
    }
  };

  // Optimized dirty byte updater with page grouping and batch commands
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
      
      // Sort dirty bytes by page and column for more efficient I2C commands
      for (let i = 0; i < dirtyByteArrayLen; i++) {
        const byteIndex = dirtyByteArray[i];
        const page = Math.floor(byteIndex / this.WIDTH);
        const col = Math.floor(byteIndex % this.WIDTH);
        
        if (!pageGroups.has(page)) {
          pageGroups.set(page, []);
        }
        
        pageGroups.get(page).push({
          col,
          byteIndex
        });
      }
      
      // Now update each page's dirty bytes
      for (const [page, bytes] of pageGroups.entries()) {
        // Sort by column for sequential access
        bytes.sort((a, b) => a.col - b.col);
        
        // Optimize for consecutive columns by grouping them into ranges
        let currentStart = null;
        let currentEnd = null;
        let currentData = [];
        
        const flushCurrentRange = async () => {
          if (currentStart !== null) {
            // Send display position commands as a batch
            const displaySeq = [
              this.COLUMN_ADDR,
              currentStart,
              currentEnd,
              this.PAGE_ADDR,
              page,
              page
            ];
            
            await this._transferBatch('cmd', displaySeq);
            
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

export default SSD1306;
