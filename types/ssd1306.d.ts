// Type definitions for oled-rpi-i2c-bus-async SSD1306 OLED driver
// Project: https://github.com/grevelle/oled-rpi-i2c-bus-async
// Definitions by: GitHub Copilot

declare module '../drivers/ssd1306.mjs' {
  import BaseOLED from '../drivers/base-oled.mjs';
  import { PromisifiedBus } from 'i2c-bus';
  import { OledOptions } from '../types/oled';

  /**
   * SSD1306 OLED driver implementation
   */
  export default class SSD1306 extends BaseOLED {
    /** SSD1306 specific command: Set start line */
    SET_START_LINE: number;
    /** SSD1306 specific command: Charge pump */
    CHARGE_PUMP: number;
    /** SSD1306 specific command: Memory mode */
    MEMORY_MODE: number;
    /** SSD1306 specific command: Segment remap */
    SEG_REMAP: number;
    /** SSD1306 specific command: COM scan dec */
    COM_SCAN_DEC: number;
    /** SSD1306 specific command: COM scan inc */
    COM_SCAN_INC: number;
    /** SSD1306 specific command: Set COM pins */
    SET_COM_PINS: number;
    /** SSD1306 specific command: Column address */
    COLUMN_ADDR: number;
    /** SSD1306 specific command: Page address */
    PAGE_ADDR: number;
    /** SSD1306 specific command: Activate scroll */
    ACTIVATE_SCROLL: number;
    /** SSD1306 specific command: Deactivate scroll */
    DEACTIVATE_SCROLL: number;
    /** SSD1306 specific command: Set vertical scroll area */
    SET_VERTICAL_SCROLL_AREA: number;
    /** SSD1306 specific command: Right horizontal scroll */
    RIGHT_HORIZONTAL_SCROLL: number;
    /** SSD1306 specific command: Left horizontal scroll */
    LEFT_HORIZONTAL_SCROLL: number;
    /** SSD1306 specific command: Vertical and right horizontal scroll */
    VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL: number;
    /** SSD1306 specific command: Vertical and left horizontal scroll */
    VERTICAL_AND_LEFT_HORIZONTAL_SCROLL: number;

    /** Screen configuration based on screen size */
    screenConfig: {
      multiplex: number;
      compins: number;
      coloffset: number;
    };

    /**
     * Creates a new SSD1306 driver instance
     * @param i2c - I2C bus instance
     * @param opts - Configuration options
     */
    constructor(i2c: PromisifiedBus, opts?: OledOptions);

    /**
     * Activate scrolling for rows start through stop using batch commands
     * @param dir - Scroll direction ('left', 'right', 'left diagonal', or 'right diagonal')
     * @param start - Start row
     * @param stop - End row
     */
    startScroll(dir: 'left' | 'right' | 'left diagonal' | 'right diagonal', start: number, stop: number): Promise<void>;

    /**
     * Stop scrolling display contents
     */
    stopScroll(): Promise<void>;

    /**
     * Send the entire framebuffer to the oled
     */
    update(): Promise<void>;

    /**
     * Optimize display initialization with batch commands for better efficiency
     */
    _initialise(): Promise<void>;

    /**
     * Optimized dirty byte updater with page grouping and batch commands
     * @param dirtyByteArray - Array of dirty byte indices
     */
    _updateDirtyBytes(dirtyByteArray: number[]): Promise<void>;
  }
}