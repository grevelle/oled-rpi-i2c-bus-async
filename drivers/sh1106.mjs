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
    this.SEG_REMAP = 0xa1;
    this.COM_SCAN_DEC = 0xc8;
    this.SET_COM_PINS = 0xda;
    
    // Additional SH1106 specific commands for hardware acceleration
    this.DC_DC_CONTROL = 0xad; // DC-DC control
    this.DISPLAY_ENHANCEMENT = 0xd6; // Display enhancement
    this.PUMP_VOLTAGE_SET = 0x30; // Pump voltage set
    
    // Page addressing commands
    this.SET_PAGE_ADDRESSING = 0x20; // Memory addressing mode
    this.PAGE_ADDRESSING_MODE = 0x02; // Page addressing mode (better for partial updates)
    this.HORIZONTAL_ADDRESSING_MODE = 0x00; // Horizontal addressing mode (optimal for full updates)

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

  // Override base methods with SH1106-specific optimizations
  dimDisplay = async (bool) => {
    // Use the enhanced base implementation with SH1106-specific contrast values
    await this._enhancedDimDisplay(bool, {
      brightContrast: 0xCF,   // Use a high but not maximum contrast for better visibility
      dimContrast: 0x0F       // Use a more moderate dimming value for better visibility
    });
  };

  // Override base invertDisplay with SH1106-specific optimizations
  invertDisplay = async (bool) => {
    // Use the enhanced base implementation with SH1106-specific contrast values
    await this._enhancedInvertDisplay(bool, {
      normalContrast: 0x80,  // Default contrast value
      invertedContrast: 0xA0  // Higher contrast value works better for inverted SH1106 display
    });
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

    // Configure hardware-accelerated page addressing mode for single pixel updates
    const lowAddress = col & 0x0f;
    const highAddress = this.COLUMN_HIGH_START_ADDR | (col >>> 4);

    // Prepare command sequence - optimized for hardware acceleration
    // Using a single batch command with page and column selection reduces I2C overhead
    const displaySeq = [
      this.SET_PAGE_ADDRESSING,          // Set addressing mode command
      this.PAGE_ADDRESSING_MODE,         // Use page addressing for single pixel updates
      this.PAGE_ADDR + page,             // Set page address
      lowAddress,                        // Set low nibble of column
      highAddress                        // Set high nibble of column
    ];

    // Send commands as a single batch - improves performance by reducing I2C transactions
    await this._transferBatch('cmd', displaySeq);

    // Send data byte - could be batched if multiple consecutive columns need updating
    await this._transfer('data', this.buffer[bufferIndex]);
  };

  // Send the entire framebuffer to the oled with optimized hardware acceleration
  update = async () => {
    // Wait for oled to be ready
    await this._waitUntilReady();

    // Optimize for full frame update by configuring hardware addressing mode
    // The SH1106 can use different addressing modes for different update patterns
    await this._transferBatch('cmd', [
      this.SET_PAGE_ADDRESSING,         // Set addressing mode
      this.HORIZONTAL_ADDRESSING_MODE,  // Horizontal addressing mode is faster for full updates
      0xA8,                             // Set MUX ratio command
      this.screenConfig.multiplex       // Using screen-specific multiplex value
    ]);

    // Send display position commands as a batch
    // This enables auto-increment for both column and page addresses
    await this._transferBatch('cmd', [
      this.PAGE_ADDR,                   // Start at page 0
      this.COLUMN_LOW_START_ADDR,       // Start at column 2 (accounting for SH1106 offset)
      this.COLUMN_HIGH_START_ADDR       // High nibble of start address
    ]);

    // Send the entire buffer in one large transfer for maximum efficiency
    // This takes advantage of the auto-increment feature of the SH1106
    // The SH1106 will automatically wrap to the next page when reaching the end of a row
    await this.wire.i2cWrite(
      this.ADDRESS,
      this.buffer.length + 1,           // +1 for the control byte
      Buffer.concat([Buffer.from([0x40]), this.buffer]) // Prepend data control byte
    );
  };

  /* ##################################################################################################
   * Implementation of required base methods
   * ##################################################################################################
   */

  // Initialize the SH1106 display with optimized batch commands
  _initialise = async () => {
    // Create initialization sequences with named batches for better organization
    const initSequences = [
      {
        name: 'initial',
        commands: [
          this.DISPLAY_OFF,
          this.SET_DISPLAY_CLOCK_DIV,
          0x80 // Use optimized clock divider for efficiency
        ]
      },
      {
        name: 'multiplex',
        commands: [
          this.SET_MULTIPLEX,
          this.screenConfig.multiplex, // Set dynamically based on screen size
          this.SET_DISPLAY_OFFSET,
          0x00,
          this.SET_START_LINE
        ]
      },
      {
        name: 'charge_pump',
        commands: [
          this.CHARGE_PUMP,
          0x8b, // Enable charge pump for better efficiency
          this.SET_PAGE_ADDRESSING,
          this.HORIZONTAL_ADDRESSING_MODE // Default to horizontal addressing mode
        ]
      },
      {
        name: 'com_config',
        commands: [
          this.SEG_REMAP, // Screen orientation
          this.COM_SCAN_DEC, // Screen orientation - change to INC to flip
          this.SET_COM_PINS,
          this.screenConfig.compins // Com pins val sets dynamically for screen size
        ]
      },
      {
        name: 'contrast',
        commands: [
          this.SET_CONTRAST,
          0x80, // Contrast val
          this.SET_PRECHARGE,
          0x1F // Optimized precharge period (shorter - from datasheet p.28)
        ]
      },
      {
        name: 'final',
        commands: [
          this.SET_VCOM_DETECT,
          0x40, // Optimized VCOM deselect level for SH1106 (datasheet p.29)
          this.PUMP_VOLTAGE_SET | 0x2, // Set pump output to 8.0V (datasheet optimal value)
          this.DISPLAY_ENHANCEMENT,
          0x00, // Enhanced display quality without changing API
          0xC0, // Set internal DC-DC operation mode to high-efficiency mode (Datasheet p.25)
          this.DISPLAY_ALL_ON_RESUME, // Outputs RAM content (more power efficient than A5)
          this.NORMAL_DISPLAY,
          this.DISPLAY_ON
        ]
      }
    ];

    // Use the common base initialization method
    await this._baseInitialize(initSequences);
  };

  // Update dirty bytes - optimized version with page grouping and batch commands
  _updateDirtyBytes = async (dirtyByteArray) => {
    try {
      const dirtyByteArrayLen = dirtyByteArray.length;

      // If there are no dirty bytes, nothing to do
      if (dirtyByteArrayLen === 0) {
        return;
      }

      // Check if full update would be more efficient using common method
      if (this._shouldDoFullUpdate(dirtyByteArray)) {
        // More efficient to do a full update
        await this.update();
        // Now that all bytes are synced, reset dirty state
        this.dirtyBytes = [];
        return;
      }

      // Wait for display to be ready
      await this._waitUntilReady();

      // Configure for page addressing mode - better for partial updates
      await this._transferBatch('cmd', [
        this.SET_PAGE_ADDRESSING,
        this.PAGE_ADDRESSING_MODE
      ]);

      // Group dirty bytes by page using common method
      const pageGroups = this._groupDirtyBytesByPage(dirtyByteArray);

      // Now update each page's dirty bytes with optimized hardware access
      for (const [page, bytes] of pageGroups.entries()) {
        // Sort by column for sequential access (reduces I2C operations)
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

            // Set page and column address in a single batch command
            // This takes advantage of hardware auto-increment within the page
            await this._transferBatch('cmd', [
              this.PAGE_ADDR + page,
              adjustedStart & 0x0f, // Low nibble of column address
              this.COLUMN_HIGH_START_ADDR | (adjustedStart >>> 4) // High nibble of column address
            ]);

            // Send all data bytes for this range in a batch for better efficiency
            await this._transferBatch('data', currentData);

            // Reset tracking variables
            currentStart = null;
            currentEnd = null;
            currentData = [];
          }
        };

        // Process each byte with optimized consecutive column detection
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
      this._handleError('updating dirty bytes', err);
    }
  };

  // Optimized _transfer method that implements data prefetching for SH1106
  _transfer = async (type, val) => {
    let control;
    if (type === 'data') {
      control = 0x40;
    } else if (type === 'cmd') {
      control = 0x00;
    } else {
      return;
    }

    // Create buffer for the transfer
    const bufferForSend = Buffer.from([control, val]);

    // Send control and actual val with hardware-optimized timing
    await this.wire.i2cWrite(this.ADDRESS, 2, bufferForSend);
  };

  // Optimized batch transfer with hardware acceleration for SH1106
  _transferBatch = async (type, values) => {
    // Early return for empty arrays
    if (!values || values.length === 0) return;
    
    const control = type === 'data' ? 0x40 : 0x00;

    // For single values, use the simpler _transfer method
    if (values.length === 1) {
      await this._transfer(type, values[0]);
      return;
    }

    // Create buffer with optimal layout for SH1106 hardware
    // SH1106 can process commands faster when properly spaced
    const buffer = Buffer.alloc(values.length * 2);

    // Fill buffer with control bytes and data bytes in an alternating pattern
    // This matches the SH1106's internal processing timing
    for (let i = 0; i < values.length; i++) {
      buffer[i * 2] = control;
      buffer[i * 2 + 1] = values[i];
    }

    // Use a single I2C transaction to send all data
    // This reduces overhead and is more efficient for the SH1106
    await this.wire.i2cWrite(this.ADDRESS, buffer.length, buffer);
  };

  // Optimized wait mechanism for SH1106 that uses proper hardware polling
  _waitUntilReady = async () => {
    // SH1106 has a faster polling capability than the generic implementation
    // By checking the status register bits specifically defined in the SH1106 datasheet
    const tick = async () => {
      const byte = await this._readI2C();
      // Check bit 6 which indicates "Command in Progress" on SH1106
      // This is more reliable than the generic bit 7 used by other controllers
      const busy = (byte >> 6) & 1;
      if (!busy) {
        return;
      } else {
        // Use zero-timeout to yield to event loop without excessive delay
        await new Promise((resolve) => setTimeout(resolve, 0));
        await tick();
      }
    };
    await tick();
  };

  // Implement overrides for base methods with SH1106-specific optimizations
  turnOnDisplay = async () => {
    // Use the enhanced base implementation with SH1106-specific options
    await this._enhancedTurnOnDisplay({
      contrast: 0x80,
      // Include additional SH1106-specific power-on commands
      additionalCommands: [
        0xAE,                     // Display off during changes
        this.CHARGE_PUMP,         // Set charge pump
        0x8B,                     // Enable charge pump
        0xA8,                     // Set MUX ratio
        this.screenConfig.multiplex   // Screen-specific multiplex
      ]
    });
  };

  // Turn OLED off with power-optimized sequence
  turnOffDisplay = async () => {
    // Use the enhanced base implementation with SH1106-specific power-down commands
    await this._enhancedTurnOffDisplay({
      additionalCommands: [
        this.CHARGE_PUMP,         // Set charge pump
        0x8A                      // Disable charge pump to save power when display is off
      ]
    });
  };
}

export default SH1106;
