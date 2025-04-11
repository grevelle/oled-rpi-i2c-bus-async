// Type definitions for oled-rpi-i2c-bus-async SH1106 OLED driver
// Project: https://github.com/grevelle/oled-rpi-i2c-bus-async
// Definitions by: GitHub Copilot

declare module '../drivers/sh1106.mjs' {
  import BaseOLED from '../drivers/base-oled.mjs';
  import { PromisifiedBus } from 'i2c-bus';
  import { OledOptions } from '../types/oled';

  /**
   * SH1106 OLED driver implementation
   */
  export default class SH1106 extends BaseOLED {
    /** SH1106 specific command: Set start line */
    SET_START_LINE: number;
    /** SH1106 specific command: Charge pump */
    CHARGE_PUMP: number;
    /** SH1106 specific command: Column low start address */
    COLUMN_LOW_START_ADDR: number;
    /** SH1106 specific command: Column high start address */
    COLUMN_HIGH_START_ADDR: number;
    /** SH1106 specific command: Page address */
    PAGE_ADDR: number;

    /** Screen configuration based on screen size */
    screenConfig: {
      multiplex: number;
      compins: number;
      coloffset: number;
    };

    /**
     * Creates a new SH1106 driver instance
     * @param i2c - I2C bus instance
     * @param opts - Configuration options
     */
    constructor(i2c: PromisifiedBus, opts?: OledOptions);

    /**
     * SH1106 does not support scrolling (no-op method with warning)
     * @param dir - Scroll direction
     * @param start - Start row
     * @param stop - End row
     */
    startScroll(dir: string, start: number, stop: number): Promise<void>;

    /**
     * SH1106 does not support scrolling (no-op method with warning)
     */
    stopScroll(): Promise<void>;

    /**
     * Draw a column of a page on the SH1106 with batch commands
     * @param page - Page number
     * @param col - Column number
     * @param byte - Byte value to write
     */
    drawPageCol(page: number, col: number, byte: number): Promise<void>;

    /**
     * Send the entire framebuffer to the oled
     */
    update(): Promise<void>;

    /**
     * Initialize the SH1106 display with optimized batch commands
     */
    _initialise(): Promise<void>;

    /**
     * Update dirty bytes - optimized version with page grouping and batch commands
     * @param dirtyByteArray - Array of dirty byte indices
     */
    _updateDirtyBytes(dirtyByteArray: number[]): Promise<void>;
  }
}