// Type definitions for oled-rpi-i2c-bus-async base OLED driver
// Project: https://github.com/grevelle/oled-rpi-i2c-bus-async
// Definitions by: GitHub Copilot

declare module '../drivers/base-oled.mjs' {
  import { PromisifiedBus } from 'i2c-bus';
  import { Font, OledOptions, RGBAImage } from '../types/oled';

  /**
   * Base OLED driver implementation
   * Contains shared functionality for SSD1306 and SH1106 drivers
   */
  export default class BaseOLED {
    /** Display height in pixels */
    HEIGHT: number;
    /** Display width in pixels */
    WIDTH: number;
    /** I2C address of the display */
    ADDRESS: number;
    /** Maximum number of pages (HEIGHT / 8) */
    MAX_PAGE_COUNT: number;
    /** Line spacing for text */
    LINESPACING: number;
    /** Letter spacing for text */
    LETTERSPACING: number;
    /** Display buffer */
    buffer: Buffer;
    /** Array of dirty bytes to update */
    dirtyBytes: number[];
    /** I2C bus interface */
    wire: PromisifiedBus;
    /** X cursor position */
    cursor_x: number;
    /** Y cursor position */
    cursor_y: number;

    /** OLED command: Display off */
    DISPLAY_OFF: number;
    /** OLED command: Display on */
    DISPLAY_ON: number;
    /** OLED command: Set display clock div */
    SET_DISPLAY_CLOCK_DIV: number;
    /** OLED command: Set multiplex */
    SET_MULTIPLEX: number;
    /** OLED command: Set display offset */
    SET_DISPLAY_OFFSET: number;
    /** OLED command: Set contrast */
    SET_CONTRAST: number;
    /** OLED command: Set precharge */
    SET_PRECHARGE: number;
    /** OLED command: Set VCOM detect */
    SET_VCOM_DETECT: number;
    /** OLED command: Display all on resume */
    DISPLAY_ALL_ON_RESUME: number;
    /** OLED command: Normal display */
    NORMAL_DISPLAY: number;
    /** OLED command: Invert display */
    INVERT_DISPLAY: number;
    /** OLED command: Set contrast control mode */
    SET_CONTRAST_CTRL_MODE: number;

    /**
     * Creates a new OLED driver instance
     * @param i2c - I2C bus instance
     * @param opts - Configuration options
     */
    constructor(i2c: PromisifiedBus, opts?: OledOptions);

    /**
     * Turn OLED on
     */
    turnOnDisplay(): Promise<void>;

    /**
     * Turn OLED off
     */
    turnOffDisplay(): Promise<void>;

    /**
     * Dim display by adjusting contrast
     * @param bool - Whether to dim the display
     */
    dimDisplay(bool: boolean): Promise<void>;

    /**
     * Invert display pixels
     * @param bool - Whether to invert display colors
     */
    invertDisplay(bool: boolean): Promise<void>;

    /**
     * Set cursor position for text
     * @param x - X coordinate
     * @param y - Y coordinate
     */
    setCursor(x: number, y: number): void;

    /**
     * Optimized method to clear all pixels on the display
     * @param sync - Whether to update display immediately
     */
    clearDisplay(sync?: boolean): Promise<void>;

    /**
     * Draw a segment of a page on the oled
     * @param page - Page number
     * @param seg - Segment number
     * @param byte - Byte value to write
     * @param sync - Whether to update display immediately
     */
    drawPageSeg(page: number, seg: number, byte: number, sync?: boolean): Promise<void>;

    /**
     * Optimized method to draw one or many pixels
     * @param pixels - Array of pixel data [x, y, color] or [[x, y, color], ...]
     * @param sync - Whether to update display immediately
     */
    drawPixel(pixels: [number, number, number] | Array<[number, number, number]>, sync?: boolean): Promise<void>;

    /**
     * Draw a line using Bresenham's line algorithm
     * @param x0 - Starting X coordinate
     * @param y0 - Starting Y coordinate
     * @param x1 - Ending X coordinate
     * @param y1 - Ending Y coordinate
     * @param color - Line color (0 for black, 1 for white)
     * @param sync - Whether to update display immediately
     */
    drawLine(x0: number, y0: number, x1: number, y1: number, color: 0 | 1, sync?: boolean): Promise<void>;

    /**
     * Draw a filled rectangle
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param w - Width
     * @param h - Height
     * @param color - Rectangle color (0 for black, 1 for white)
     * @param sync - Whether to update display immediately
     */
    fillRect(x: number, y: number, w: number, h: number, color: 0 | 1, sync?: boolean): Promise<void>;

    /**
     * Write text to the display
     * @param font - Font object
     * @param size - Font size
     * @param string - Text string
     * @param color - Text color (0 for black, 1 for white)
     * @param wrap - Whether to wrap text
     * @param sync - Whether to update display immediately
     */
    writeString(font: Font, size: number, string: string, color: 0 | 1, wrap?: boolean, sync?: boolean): Promise<void>;

    /**
     * Draw an RGBA image (optimized)
     * @param image - Image object
     * @param dx - X coordinate
     * @param dy - Y coordinate
     * @param sync - Whether to update display immediately
     */
    drawRGBAImage(image: RGBAImage, dx: number, dy: number, sync?: boolean): Promise<void>;

    /**
     * Draw a bitmap efficiently
     * @param pixels - Array of pixel data
     * @param sync - Whether to update display immediately
     */
    drawBitmap(pixels: Uint8Array | Buffer | number[], sync?: boolean): Promise<void>;

    /**
     * Draw an individual character to the screen
     * @param byteArray - Byte array containing character data
     * @param charHeight - Character height
     * @param size - Font size
     * @param sync - Whether to update display immediately
     */
    _drawChar(byteArray: number[][], charHeight: number, size: number, sync?: boolean): Promise<void>;

    /**
     * Get character bytes from the supplied font object
     * @param byteArray - Byte array containing font data
     * @param charHeight - Character height
     * @returns Array of character bytes
     */
    _readCharBytes(byteArray: number[], charHeight: number): number[][];

    /**
     * Find where the character exists within the font object
     * @param font - Font object
     * @param c - Character to find
     * @returns Character buffer
     */
    _findCharBuf(font: Font, c: string): number[];

    /**
     * Writes both commands and data buffers to this device
     * @param type - Type of data ('cmd' or 'data')
     * @param val - Value to write
     */
    _transfer(type: 'cmd' | 'data', val: number): Promise<void>;

    /**
     * Batch multiple commands or data values into a single I2C transfer for better efficiency
     * @param type - Type of data ('cmd' or 'data')
     * @param values - Values to write
     */
    _transferBatch(type: 'cmd' | 'data', values: number[] | Uint8Array | Buffer): Promise<void>;

    /**
     * Read a byte from the oled
     * @returns Read byte
     */
    _readI2C(): Promise<number>;

    /**
     * Sometimes the oled gets a bit busy with lots of bytes.
     * Read the response byte to see if this is the case
     */
    _waitUntilReady(): Promise<void>;

    /**
     * Initialize the display (must be implemented by derived classes)
     */
    _initialise(): Promise<void>;

    /**
     * Send the entire framebuffer to the oled (must be implemented by derived classes)
     */
    update(): Promise<void>;

    /**
     * Update dirty bytes (must be implemented by derived classes)
     * @param dirtyByteArray - Array of dirty byte indices
     */
    _updateDirtyBytes(dirtyByteArray: number[]): Promise<void>;
  }
}