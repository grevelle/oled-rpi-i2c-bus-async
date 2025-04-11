/**
 * Main OLED package entry point 
 * @module oled-rpi-i2c-bus-async
 * @fileoverview Asynchronous NodeJS module for controlling OLED displays on Raspberry Pi
 */
import SSD1306 from './drivers/ssd1306.mjs';
import SH1106 from './drivers/sh1106.mjs';
import { createLogger } from './utils/logger.mjs';
import fs from 'fs';
import { PNG } from 'pngjs';

// Create main logger for the OLED class
const logger = createLogger('OLED');

/**
 * Resource management for animations and timers
 * @type {Object}
 */
const resourceTracker = {
  timers: [],
  animationVars: { pdx: null, pdy: null },
  
  /**
   * Clean up a specific timer
   * @param {number} timerId - The timer ID to clear
   */
  clearTimer: (timerId) => {
    clearInterval(timerId);
    const index = resourceTracker.timers.indexOf(timerId);
    if (index > -1) {
      resourceTracker.timers.splice(index, 1);
    }
  },
  
  /**
   * Clean up all timers
   */
  clearAllTimers: () => {
    resourceTracker.timers.forEach(id => clearInterval(id));
    resourceTracker.timers = [];
  },
};

/**
 * Main OLED driver class that delegates to specific hardware implementations
 * @class
 */
class Oled {
  /**
   * Creates a new OLED display instance
   * @param {Object} i2c - I2C bus instance
   * @param {Object} opts - Configuration options
   * @param {string} [opts.driver='SSD1306'] - Driver type ('SSD1306' or 'SH1106')
   * @param {number} [opts.height=64] - Display height in pixels
   * @param {number} [opts.width=128] - Display width in pixels
   * @param {string} [opts.logLevel] - Logging level
   */
  constructor(i2c, opts) {
    // Set basic properties from options, with defaults
    this.DRIVER = opts?.driver ?? 'SSD1306';
    this.HEIGHT = opts?.height ?? 64;
    this.WIDTH = opts?.width ?? 128;
    
    // Set logger level from options or use default
    if (opts?.logLevel) {
      logger.setLevel(opts.logLevel);
    }
    
    try {
      // Create the appropriate driver implementation
      switch (this.DRIVER) {
        case 'SSD1306':
          this.api = new SSD1306(i2c, opts);
          break;
        case 'SH1106':
          this.api = new SH1106(i2c, opts);
          break;
        default:
          throw new Error(`Unknown driver: ${this.DRIVER}`);
      }
      logger.info(`Initialized ${this.DRIVER} display with dimensions ${this.WIDTH}x${this.HEIGHT}`);
    } catch (err) {
      logger.error('Failed to initialize display:', err);
      throw err;
    }
  }

  /* ######################################################################
   * OLED Controls - delegate to driver API
   * ######################################################################
   */

  /**
   * Turn on the display
   * @async
   * @returns {Promise<void>}
   */
  turnOnDisplay = async () => {
    await this.api.turnOnDisplay();
  };

  /**
   * Turn off the display
   * @async
   * @returns {Promise<void>}
   */
  turnOffDisplay = async () => {
    await this.api.turnOffDisplay();
  };

  /**
   * Dim the display
   * @async
   * @param {boolean} bool - Whether to dim the display
   * @returns {Promise<void>}
   */
  dimDisplay = async (bool) => {
    await this.api.dimDisplay(bool);
  };

  /**
   * Invert pixels on oled
   * @async
   * @param {boolean} bool - Whether to invert display colors
   * @returns {Promise<void>}
   */
  invertDisplay = async (bool) => {
    await this.api.invertDisplay(bool);
  };

  /**
   * Activate scrolling for rows start through stop
   * @async
   * @param {string} dir - Scroll direction ('left' or 'right')
   * @param {number} start - Start row
   * @param {number} stop - End row
   * @returns {Promise<void>}
   */
  startScroll = async (dir, start, stop) => {
    await this.api.startScroll(dir, start, stop);
  };

  /**
   * Stop scrolling display contents
   * @async
   * @returns {Promise<void>}
   */
  stopScroll = async () => {
    await this.api.stopScroll();
  };

  /**
   * Send the entire framebuffer to the oled
   * @async
   * @returns {Promise<void>}
   */
  update = async () => {
    await this.api.update();
  };

  /* ######################################################################
   * OLED Drawings - delegate to driver API
   * ######################################################################
   */

  /**
   * Clear all pixels on the display
   * @async
   * @param {boolean} sync - Whether to update display immediately
   * @returns {Promise<void>}
   */
  clearDisplay = async (sync) => {
    await this.api.clearDisplay(sync);
  };

  /**
   * Set starting position of a text string on the oled
   * @async
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Promise<void>}
   */
  setCursor = async (x, y) => {
    this.api.setCursor(x, y);
  };

  /**
   * Draw a column of a page on the oled
   * @async
   * @param {number} page - Page number
   * @param {number} col - Column number
   * @param {number} byte - Byte value to write
   * @returns {Promise<void>}
   */
  drawPageCol = async (page, col, byte) => {
    // Call drawPageCol if the driver has it, otherwise use drawPageSeg
    if (typeof this.api.drawPageCol === 'function') {
      await this.api.drawPageCol(page, col, byte);
    } else {
      await this.api.drawPageSeg(page, col, byte, true);
    }
  };

  /**
   * Draw a segment of a page on the oled
   * @async
   * @param {number} page - Page number
   * @param {number} seg - Segment number
   * @param {number} byte - Byte value to write
   * @param {boolean} sync - Whether to update display immediately
   * @returns {Promise<void>}
   */
  drawPageSeg = async (page, seg, byte, sync) => {
    await this.api.drawPageSeg(page, seg, byte, sync);
  };

  /**
   * Draw one or many pixels on oled
   * @async
   * @param {Array} pixels - Array of pixel data
   * @param {boolean} sync - Whether to update display immediately
   * @returns {Promise<void>}
   */
  drawPixel = async (pixels, sync) => {
    await this.api.drawPixel(pixels, sync);
  };

  /**
   * Draw a line
   * @async
   * @param {number} x0 - Starting X coordinate
   * @param {number} y0 - Starting Y coordinate
   * @param {number} x1 - Ending X coordinate
   * @param {number} y1 - Ending Y coordinate
   * @param {number} color - Line color
   * @param {boolean} sync - Whether to update display immediately
   * @returns {Promise<void>}
   */
  drawLine = async (x0, y0, x1, y1, color, sync) => {
    await this.api.drawLine(x0, y0, x1, y1, color, sync);
  };

  /**
   * Draw a filled rectangle
   * @async
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} w - Width
   * @param {number} h - Height
   * @param {number} color - Rectangle color
   * @param {boolean} sync - Whether to update display immediately
   * @returns {Promise<void>}
   */
  fillRect = async (x, y, w, h, color, sync) => {
    await this.api.fillRect(x, y, w, h, color, sync);
  };

  /**
   * Write text to the oled
   * @async
   * @param {Object} font - Font object
   * @param {number} size - Font size
   * @param {string} string - Text string
   * @param {number} color - Text color
   * @param {boolean} wrap - Whether to wrap text
   * @param {boolean} sync - Whether to update display immediately
   * @returns {Promise<void>}
   */
  writeString = async (font, size, string, color, wrap, sync) => {
    await this.api.writeString(font, size, string, color, wrap, sync);
  };

  /**
   * Draw an RGBA image at the specified coordinates
   * @async
   * @param {Object} image - Image object
   * @param {number} dx - X coordinate
   * @param {number} dy - Y coordinate
   * @param {boolean} sync - Whether to update display immediately
   * @returns {Promise<void>}
   */
  drawRGBAImage = async (image, dx, dy, sync) => {
    await this.api.drawRGBAImage(image, dx, dy, sync);
  };

  /**
   * Draw an image pixel array on the screen
   * @async
   * @param {Array} pixels - Array of pixel data
   * @param {boolean} sync - Whether to update display immediately
   * @returns {Promise<void>}
   */
  drawBitmap = async (pixels, sync) => {
    await this.api.drawBitmap(pixels, sync);
  };

  /* ######################################################################
   * OLED Shape/Indicators
   * ######################################################################
   */

  /**
   * Draw a battery icon on the oled with parallel operations
   * @async
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} percentage - Battery percentage
   * @returns {Promise<void>}
   */
  battery = async (x, y, percentage) => {
    try {
      // Draw the battery outline in parallel
      await Promise.all([
        this.drawLine(x, y, x + 16, y, 1),
        this.drawLine(x, y + 8, x + 16, y + 8, 1),
        this.drawLine(x, y, x, y + 8, 1),
        this.drawPixel([
          [x + 17, y + 1, 1],
          [x + 17, y + 7, 1],
        ]),
        this.drawLine(x + 18, y + 1, x + 18, y + 7, 1)
      ]);
      
      // Draw battery level based on percentage
      let operations = [];
      
      if (percentage >= 70) {
        operations = [
          this.fillRect(x + 2, y + 2, 3, 5, 1, false),
          this.fillRect(x + 7, y + 2, 3, 5, 1, false),
          this.fillRect(x + 12, y + 2, 3, 5, 1, true)
        ];
      } else if (percentage >= 40) {
        operations = [
          this.fillRect(x + 2, y + 2, 3, 5, 1, false),
          this.fillRect(x + 7, y + 2, 3, 5, 1, false),
          this.fillRect(x + 12, y + 2, 3, 5, 0, true)
        ];
      } else if (percentage >= 10) {
        operations = [
          this.fillRect(x + 2, y + 2, 3, 5, 1, false),
          this.fillRect(x + 7, y + 2, 3, 5, 0, false),
          this.fillRect(x + 12, y + 2, 3, 5, 0, true)
        ];
      } else {
        operations = [
          this.fillRect(x + 2, y + 2, 3, 5, 0, false),
          this.fillRect(x + 7, y + 2, 3, 5, 0, false),
          this.fillRect(x + 12, y + 2, 3, 5, 0, true)
        ];
      }
      
      await Promise.all(operations);
    } catch (err) {
      logger.error('Error drawing battery icon:', err);
      throw err;
    }
  };

  /**
   * Draw a bluetooth icon on the oled with parallel operations
   * @async
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Promise<void>}
   */
  bluetooth = async (x, y) => {
    try {
      await Promise.all([
        this.drawLine(x + 5, y + 1, x + 5, y + 11, 1),
        this.drawLine(x + 2, y + 3, x + 9, y + 8, 1),
        this.drawLine(x + 2, y + 9, x + 8, y + 3, 1),
        this.drawLine(x + 5, y + 1, x + 9, y + 3, 1),
        this.drawLine(x + 5, y + 11, x + 8, y + 9, 1)
      ]);
    } catch (err) {
      logger.error('Error drawing bluetooth icon:', err);
      throw err;
    }
  };

  /**
   * Draw a wifi icon on the oled with parallel operations
   * @async
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} percentage - Signal strength percentage
   * @returns {Promise<void>}
   */
  wifi = async (x, y, percentage) => {
    try {
      // Draw the wifi base in parallel
      await Promise.all([
        this.drawLine(x, y, x + 8, y, 1),
        this.drawLine(x, y, x + 4, y + 4, 1),
        this.drawLine(x + 8, y, x + 4, y + 4, 1),
        this.drawLine(x + 4, y, x + 4, y + 9, 1)
      ]);

      // Draw signal strength based on percentage
      let operations = [];
      
      if (percentage >= 70) {
        operations = [
          this.fillRect(x + 6, y + 8, 2, 2, 1, true),
          this.fillRect(x + 10, y + 6, 2, 4, 1, true),
          this.fillRect(x + 14, y + 4, 2, 6, 1, true)
        ];
      } else if (percentage >= 40) {
        operations = [
          this.fillRect(x + 6, y + 8, 2, 2, 1, true),
          this.fillRect(x + 10, y + 6, 2, 4, 1, true),
          this.fillRect(x + 14, y + 4, 2, 6, 0, true)
        ];
      } else if (percentage >= 10) {
        operations = [
          this.fillRect(x + 6, y + 8, 2, 2, 1, true),
          this.fillRect(x + 10, y + 6, 2, 4, 0, true),
          this.fillRect(x + 14, y + 4, 2, 6, 0, true)
        ];
      } else {
        operations = [
          this.fillRect(x + 6, y + 8, 2, 2, 0, true),
          this.fillRect(x + 10, y + 6, 2, 4, 0, true),
          this.fillRect(x + 14, y + 4, 2, 6, 0, true)
        ];
      }
      
      await Promise.all(operations);
    } catch (err) {
      logger.error('Error drawing wifi icon:', err);
      throw err;
    }
  };

  /**
   * Draw or animate an image
   * @async
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string|Object} image - Image path or object
   * @param {Object} font - Font object
   * @param {boolean} clear - Whether to clear the display before drawing
   * @param {boolean} reset - Whether to reset the animation
   * @param {boolean} animated - Whether the image is animated
   * @param {boolean} wrapping - Whether to wrap text
   * @returns {Promise<void>}
   */
  image = async (x, y, image, font, clear, reset, animated, wrapping) => {
    try {
      const dirresources = `${process.cwd()}/resources/`;
      let tryImage = '';

      // Handle reset case
      if (reset) {
        // Clean up resources
        resourceTracker.clearAllTimers();
        resourceTracker.animationVars.pdx = null;
        resourceTracker.animationVars.pdy = null;
        
        // Clear display if requested
        if (clear) {
          await this.clearDisplay();
        }
        return;
      }

      // Handle relative path
      if (typeof image === 'string' && !image.includes('/')) {
        tryImage = image;
        image = `${dirresources}${image}`;
      }

      // Check if file exists
      try {
        if (!fs.statSync(image).isFile()) {
          logger.warn(`File ${image} does not exist.`);
        }
      } catch (err) {
        logger.warn(`Error accessing file ${image}:`, err);
        image = `${dirresources}notafile.png`;
        x = 0;
        y = 17;
        await this.clearDisplay();
        await this.writeString(font, 1, tryImage ?? 'File not found', 1, wrapping);
      }

      // Clear display if requested
      if (clear) {
        await this.clearDisplay();
      }

      // Process the image
      const _oled = this;
      
      // Use a proper Promise-based approach for handling the PNG stream
      await new Promise((resolve, reject) => {
        fs.createReadStream(image)
          .pipe(new PNG({ filterType: 4 }))
          .on('parsed', async function() {
            try {
              if (animated) {
                resourceTracker.animationVars.pdx = 1;
                resourceTracker.animationVars.pdy = -1;
                
                // Create animation interval
                const myInterval = setInterval(async () => {
                  try {
                    await _oled._drawPseudo(
                      _oled, 
                      clear, 
                      this, 
                      resourceTracker.animationVars.pdx, 
                      resourceTracker.animationVars.pdy
                    );
                  } catch (err) {
                    logger.error('Animation error:', err);
                    resourceTracker.clearTimer(myInterval);
                  }
                }, 10);
                
                resourceTracker.timers.push(myInterval);
              } else {
                // Draw static image
                await _oled.api.drawRGBAImage(
                  this,
                  x ?? Math.floor((_oled.WIDTH - this.width) / 2),
                  y ?? Math.floor((_oled.HEIGHT - this.height) / 2),
                  true
                );
              }
              resolve();
            } catch (err) {
              reject(err);
            }
          })
          .on('error', (err) => {
            logger.error('PNG processing error:', err);
            reject(err);
          });
      });
      
    } catch (err) {
      logger.error('Image processing error:', err);
      throw err;
    }
  };

  /**
   * Animate an image on the display
   * @async
   * @param {Object} display - Display instance
   * @param {boolean} clear - Whether to clear the display before drawing
   * @param {Object} image - Image object
   * @param {number} pdx - X direction
   * @param {number} pdy - Y direction
   * @returns {Promise<void>}
   */
  _drawPseudo = async (display, clear, image, pdx, pdy) => {
    try {
      // Initialize animation state if needed
      if (
        typeof this._drawPseudo.init === 'undefined' ||
        this._drawPseudo.init === true ||
        this._drawPseudo.image !== image
      ) {
        this._drawPseudo.init = false;
        this._drawPseudo.image = image;
        this._drawPseudo.x = 1;
        this._drawPseudo.y = 1;
        this._drawPseudo.prevX = 1;
        this._drawPseudo.prevY = 1;
        this._drawPseudo.dx = pdx;
        this._drawPseudo.dy = pdy;
      }
      
      if (clear) {
        // Optimize by using Promise.all for parallel drawing
        await Promise.all([
          display.fillRect(0, 0, display.WIDTH, display.HEIGHT, 1, true),
          display.fillRect(1, 1, display.WIDTH - 2, display.HEIGHT - 2, 0, true)
        ]);
      } else {
        // Clear previous image position
        await display.fillRect(
          this._drawPseudo.prevX,
          this._drawPseudo.prevY,
          image.width,
          image.height,
          0,
          false
        );
        
        // Update position tracking
        this._drawPseudo.prevX = this._drawPseudo.x;
        this._drawPseudo.prevY = this._drawPseudo.y;
      }

      // Draw image at current position
      await display.drawRGBAImage(image, this._drawPseudo.x, this._drawPseudo.y, true);
      
      // Handle boundary conditions and update position
      if (
        this._drawPseudo.x + this._drawPseudo.dx > display.WIDTH - image.width ||
        this._drawPseudo.x < 1
      ) {
        this._drawPseudo.dx = -this._drawPseudo.dx;
      }
      
      if (
        this._drawPseudo.y + this._drawPseudo.dy > display.HEIGHT - image.height ||
        this._drawPseudo.y < 1
      ) {
        this._drawPseudo.dy = -this._drawPseudo.dy;
      }

      // Update position for next frame
      this._drawPseudo.x += this._drawPseudo.dx;
      this._drawPseudo.y += this._drawPseudo.dy;
    } catch (err) {
      logger.error('Animation frame error:', err);
      throw err;
    }
  };
}

export default Oled;
