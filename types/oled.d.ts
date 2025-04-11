// Type definitions for oled-rpi-i2c-bus-async
// Project: https://github.com/grevelle/oled-rpi-i2c-bus-async
// Definitions by: GitHub Copilot

declare module 'oled-rpi-i2c-bus-async' {
  import { PromisifiedBus } from 'i2c-bus';

  /**
   * Font object type definition
   */
  export interface Font {
    width: number;
    height: number;
    lookup: string;
    fontData: number[];
  }

  /**
   * RGBA Image interface
   */
  export interface RGBAImage {
    width: number;
    height: number;
    data: Uint8Array | Buffer;
  }

  /**
   * Configuration options for OLED display
   */
  export interface OledOptions {
    /** Display width in pixels (default: 128) */
    width?: number;
    /** Display height in pixels (default: 64) */
    height?: number;
    /** I2C address of the display (default: 0x3c) */
    address?: number;
    /** I2C bus number */
    bus?: number;
    /** Driver type ('SSD1306' or 'SH1106') (default: 'SSD1306') */
    driver?: 'SSD1306' | 'SH1106';
    /** Logging level ('debug', 'info', 'warn', 'error', 'silent') */
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
    /** Line spacing for text (default: 1) */
    linespacing?: number;
    /** Letter spacing for text (default: 1) */
    letterspacing?: number;
  }

  /**
   * Main OLED driver class that delegates to specific hardware implementations
   */
  export default class Oled {
    /** Display width in pixels */
    WIDTH: number;
    /** Display height in pixels */
    HEIGHT: number;
    /** Display driver type */
    DRIVER: string;

    /**
     * Creates a new OLED display instance
     * @param i2c - I2C bus instance
     * @param opts - Configuration options
     */
    constructor(i2c: PromisifiedBus, opts?: OledOptions);

    /**
     * Turn on the display
     */
    turnOnDisplay(): Promise<void>;

    /**
     * Turn off the display
     */
    turnOffDisplay(): Promise<void>;

    /**
     * Dim the display
     * @param bool - Whether to dim the display
     */
    dimDisplay(bool: boolean): Promise<void>;

    /**
     * Invert pixels on oled
     * @param bool - Whether to invert display colors
     */
    invertDisplay(bool: boolean): Promise<void>;

    /**
     * Activate scrolling for rows start through stop
     * @param dir - Scroll direction ('left' or 'right')
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
     * Clear all pixels on the display
     * @param sync - Whether to update display immediately
     */
    clearDisplay(sync?: boolean): Promise<void>;

    /**
     * Set starting position of a text string on the oled
     * @param x - X coordinate
     * @param y - Y coordinate
     */
    setCursor(x: number, y: number): Promise<void>;

    /**
     * Draw a column of a page on the oled
     * @param page - Page number
     * @param col - Column number
     * @param byte - Byte value to write
     */
    drawPageCol(page: number, col: number, byte: number): Promise<void>;

    /**
     * Draw a segment of a page on the oled
     * @param page - Page number
     * @param seg - Segment number
     * @param byte - Byte value to write
     * @param sync - Whether to update display immediately
     */
    drawPageSeg(page: number, seg: number, byte: number, sync?: boolean): Promise<void>;

    /**
     * Draw one or many pixels on oled
     * @param pixels - Array of pixel data [x, y, color] or [[x, y, color], ...]
     * @param sync - Whether to update display immediately
     */
    drawPixel(pixels: [number, number, number] | Array<[number, number, number]>, sync?: boolean): Promise<void>;

    /**
     * Draw a line
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
     * Write text to the oled
     * @param font - Font object
     * @param size - Font size
     * @param string - Text string
     * @param color - Text color (0 for black, 1 for white)
     * @param wrap - Whether to wrap text
     * @param sync - Whether to update display immediately
     */
    writeString(font: Font, size: number, string: string, color: 0 | 1, wrap?: boolean, sync?: boolean): Promise<void>;

    /**
     * Draw an RGBA image at the specified coordinates
     * @param image - Image object
     * @param dx - X coordinate
     * @param dy - Y coordinate
     * @param sync - Whether to update display immediately
     */
    drawRGBAImage(image: RGBAImage, dx: number, dy: number, sync?: boolean): Promise<void>;

    /**
     * Draw an image pixel array on the screen
     * @param pixels - Array of pixel data
     * @param sync - Whether to update display immediately
     */
    drawBitmap(pixels: Uint8Array | Buffer | number[], sync?: boolean): Promise<void>;

    /**
     * Draw a battery icon on the oled with parallel operations
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param percentage - Battery percentage
     */
    battery(x: number, y: number, percentage: number): Promise<void>;

    /**
     * Draw a bluetooth icon on the oled with parallel operations
     * @param x - X coordinate
     * @param y - Y coordinate
     */
    bluetooth(x: number, y: number): Promise<void>;

    /**
     * Draw a wifi icon on the oled with parallel operations
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param percentage - Signal strength percentage
     */
    wifi(x: number, y: number, percentage: number): Promise<void>;

    /**
     * Draw or animate an image
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param image - Image path or object
     * @param font - Font object
     * @param clear - Whether to clear the display before drawing
     * @param reset - Whether to reset the animation
     * @param animated - Whether the image is animated
     * @param wrapping - Whether to wrap text
     */
    image(
      x: number,
      y: number,
      image: string,
      font: Font,
      clear?: boolean,
      reset?: boolean,
      animated?: boolean,
      wrapping?: boolean
    ): Promise<void>;
  }
}