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

  // Send the entire framebuffer to the oled with hardware acceleration
  update = async () => {
    // Wait for oled to be ready
    await this._waitUntilReady();

    // Set the addressing mode for optimal full screen updates
    await this._transferBatch('cmd', [
      this.MEMORY_MODE,
      this.HORIZONTAL_ADDRESSING_MODE,  // Horizontal is best for full updates
      0xD5,                             // Set display clock divide ratio/oscillator frequency
      0xF0                              // Set higher frequency for faster refresh (per SSD1306 datasheet section 10.1.16)
    ]);

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

    // Write buffer data in one efficient transfer
    const bufferToSend = Buffer.concat([Buffer.from([0x40]), this.buffer]);
    await this.wire.i2cWrite(this.ADDRESS, bufferToSend.length, bufferToSend);
  };

  /* ##################################################################################################
   * Implementation of required base methods
   * ##################################################################################################
   */

  // Optimize display initialization with batch commands for better efficiency
  _initialise = async () => {
    // Create initialization sequences with named batches for better organization
    const initSequences = [
      {
        name: 'initial',
        commands: [
          this.DISPLAY_OFF,
          this.SET_DISPLAY_CLOCK_DIV, 
          0x80  // Use datasheet-recommended clock divider for best performance
        ]
      },
      {
        name: 'multiplex',
        commands: [
          this.SET_MULTIPLEX,
          this.screenConfig.multiplex,
          this.SET_DISPLAY_OFFSET,
          0x00,
          this.SET_START_LINE | 0x00  // Start at line 0
        ]
      },
      {
        name: 'charge_pump',
        commands: [
          this.CHARGE_PUMP, 
          0x14,                          // Enable charge pump with optimal setting
          this.MEMORY_MODE, 
          this.HORIZONTAL_ADDRESSING_MODE // Default to horizontal addressing mode for efficiency
        ]
      },
      {
        name: 'com_config',
        commands: [
          this.SEG_REMAP,                // Column address 127 is mapped to SEG0
          this.COM_SCAN_DEC,             // Scan from COM[N-1] to COM0
          this.SET_COM_PINS,
          this.HEIGHT === 32 ? 0x02 : 0x12 // Optimize COM pins for display height
        ]
      },
      {
        name: 'contrast',
        commands: [
          this.SET_CONTRAST, 
          this.HEIGHT === 32 ? 0x8F : 0xCF, // Optimize contrast based on display height
          this.SET_PRECHARGE, 
          0xf1                          // Phase 1 = 15, Phase 2 = 1 (optimal from datasheet)
        ]
      },
      {
        name: 'final',
        commands: [
          this.SET_VCOM_DETECT,
          this.HEIGHT === 64 ? 0x20 : 0x40, // Optimize VCOM level based on display size
          this.DISPLAY_ALL_ON_RESUME,       // Resume to RAM content display (power efficient)
          this.NORMAL_DISPLAY,
          this.DISPLAY_ON
        ]
      }
    ];

    // Use the common base initialization method
    await this._baseInitialize(initSequences);
  };

  // Optimized dirty byte updater with page grouping and batch commands
  _updateDirtyBytes = async (dirtyByteArray) => {
    try {
      const dirtyByteArrayLen = dirtyByteArray.length;

      // If there are no dirty bytes, nothing to do
      if (dirtyByteArrayLen === 0) {
        return;
      }

      // Check if full update would be more efficient - using common method
      if (this._shouldDoFullUpdate(dirtyByteArray)) {
        // More efficient to do a full update
        await this.update();
        // Now that all bytes are synced, reset dirty state
        this.dirtyBytes = [];
        return;
      }

      // Wait for display to be ready
      await this._waitUntilReady();
      
      // Set memory mode to page addressing and optimize command discharge timing
      // for faster partial updates (see datasheet section 10.1.18)
      await this._transferBatch('cmd', [
        this.MEMORY_MODE,
        this.PAGE_ADDRESSING_MODE, // Page addressing is better for partial updates
        0xD9,                      // Set pre-charge period command
        0x22                       // Faster discharge time for partial updates
      ]);

      // Group dirty bytes by page for more efficient updates - using common method
      const pageGroups = this._groupDirtyBytesByPage(dirtyByteArray);

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
              page,
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
      this._handleError('updating dirty bytes', err);
    }
  };

  // Override base methods with SSD1306-specific optimizations
  dimDisplay = async (bool) => {
    // Use the enhanced base implementation with SSD1306-specific contrast values
    await this._enhancedDimDisplay(bool, {
      brightContrast: 0xCF,  // Optimal bright contrast for SSD1306
      dimContrast: 0x00      // SSD1306 can handle complete dimming
    });
  };

  invertDisplay = async (bool) => {
    // Use the enhanced base implementation with SSD1306-specific contrast values
    await this._enhancedInvertDisplay(bool, {
      normalContrast: 0x8F,   // Default contrast for normal display
      invertedContrast: 0x60  // Lower contrast works better for inverted SSD1306 display
    });
  };

  turnOnDisplay = async () => {
    // Use the enhanced base implementation with SSD1306-specific options
    await this._enhancedTurnOnDisplay({
      contrast: 0x8F,
      // Include additional SSD1306-specific power-on commands
      additionalCommands: [
        this.CHARGE_PUMP,      // Set charge pump
        0x14,                  // Enable charge pump
        this.SET_PRECHARGE,    // Set pre-charge period
        0xF1                   // Phase 1 = 15, Phase 2 = 1 (optimal for fast turn-on)
      ]
    });
  };

  turnOffDisplay = async () => {
    // Use the enhanced base implementation with SSD1306-specific power-down commands
    await this._enhancedTurnOffDisplay({
      additionalCommands: [
        this.CHARGE_PUMP,     // Set charge pump
        0x10                  // Disable charge pump to save power
      ]
    });
  };
}

export default SSD1306;
