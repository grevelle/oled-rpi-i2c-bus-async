// Base OLED driver implementation
// Contains shared functionality for SSD1306 and SH1106 drivers
import { createLogger } from '../utils/logger.mjs';

class BaseOLED {
  constructor(i2c, opts) {
    // Create a driver-specific logger
    this.logger = createLogger('BaseOLED');
    
    // Use optional chaining and nullish coalescing for options
    this.HEIGHT = opts?.height ?? 64;
    this.WIDTH = opts?.width ?? 128;
    this.ADDRESS = opts?.address ?? 0x3c;

    this.MAX_PAGE_COUNT = this.HEIGHT / 8;
    this.LINESPACING = opts?.linespacing ?? 1;
    this.LETTERSPACING = opts?.letterspacing ?? 1;
    
    // Set logger level if provided
    if (opts?.logLevel) {
      this.logger.setLevel(opts.logLevel);
    }

    // Common command definitions for all OLED displays
    this.DISPLAY_OFF = 0xae;
    this.DISPLAY_ON = 0xaf;
    this.SET_DISPLAY_CLOCK_DIV = 0xd5;
    this.SET_MULTIPLEX = 0xa8;
    this.SET_DISPLAY_OFFSET = 0xd3;
    this.SET_CONTRAST = 0x81;
    this.SET_PRECHARGE = 0xd9;
    this.SET_VCOM_DETECT = 0xdb;
    this.DISPLAY_ALL_ON_RESUME = 0xa4;
    this.NORMAL_DISPLAY = 0xa6;
    this.INVERT_DISPLAY = 0xa7;
    this.SET_CONTRAST_CTRL_MODE = 0x81;

    // Initialize cursor position
    this.cursor_x = 0;
    this.cursor_y = 0;

    // Create blank buffer (1 byte per pixel)
    this.buffer = Buffer.alloc((this.WIDTH * this.HEIGHT) / 8);
    this.buffer.fill(0xff);
    this.dirtyBytes = [];

    // Store the i2c interface
    this.wire = i2c;
  }

  /* ##################################################################################################
   * Common OLED control methods
   * ##################################################################################################
   */
   
  // Turn OLED on
  turnOnDisplay = async () => {
    await this._transfer('cmd', this.DISPLAY_ON);
  };

  // Turn OLED off
  turnOffDisplay = async () => {
    await this._transfer('cmd', this.DISPLAY_OFF);
  };

  // Dim display by adjusting contrast
  dimDisplay = async (bool) => {
    const contrast = bool ? 0 : 0xff; // Dimmed display if true, bright display if false
    await this._transfer('cmd', this.SET_CONTRAST_CTRL_MODE);
    await this._transfer('cmd', contrast);
  };

  // Invert display pixels
  invertDisplay = async (bool) => {
    if (bool) {
      await this._transfer('cmd', this.INVERT_DISPLAY); // inverted
    } else {
      await this._transfer('cmd', this.NORMAL_DISPLAY); // non inverted
    }
  };

  /* ##################################################################################################
   * Common drawing methods
   * ##################################################################################################
   */

  // Set cursor position for text
  setCursor = (x, y) => {
    this.cursor_x = x;
    this.cursor_y = y;
  };

  // Optimized method to clear all pixels on the display
  clearDisplay = async (sync) => {
    try {
      // Fast buffer clear operation using fill
      this.buffer.fill(0x00);
      
      // Since we're clearing the entire display, mark everything as dirty
      this.dirtyBytes = Array.from({ length: this.buffer.length }, (_, i) => i);
      
      if (sync) {
        // For a full clear, do a full update - more efficient than updating every dirty byte
        await this.update();
        this.dirtyBytes = []; // Reset dirty bytes after update
      }
    } catch (err) {
      this.logger.error('Error clearing display:', err);
      throw err;
    }
  };

  // Draw a segment of a page on the oled
  drawPageSeg = async (page, seg, byte, sync) => {
    if (
      page < 0 ||
      page >= this.MAX_PAGE_COUNT ||
      seg < 0 ||
      seg >= this.WIDTH
    ) {
      return;
    }

    // Wait for oled to be ready
    await this._waitUntilReady();

    // Set the start and end byte locations for oled display update
    const bufferIndex = seg + page * this.WIDTH;
    this.buffer[bufferIndex] = byte;

    if (!this.dirtyBytes.includes(bufferIndex)) {
      this.dirtyBytes.push(bufferIndex);
    }

    if (sync) {
      await this._updateDirtyBytes(this.dirtyBytes);
    }
  };

  // Optimized method to draw one or many pixels
  drawPixel = async (pixels, sync) => {
    try {
      // Handle lazy single pixel case
      if (typeof pixels[0] !== 'object') {
        pixels = [pixels];
      }

      // Process all pixels in a batch
      pixels.forEach((el) => {
        // Return if the pixel is out of range
        const x = el[0];
        const y = el[1];
        const color = el[2];

        if (x < 0 || x >= this.WIDTH || y < 0 || y >= this.HEIGHT) {
          return;
        }

        // More efficient calculation of byte position
        const page = Math.floor(y / 8);
        const byte = x + this.WIDTH * page;
        const pageShift = 0x01 << (y & 0x07); // Faster than (y - 8 * page)

        // Optimize setting pixel (monochrome)
        if (color === 'BLACK' || !color) {
          this.buffer[byte] &= ~pageShift;
        } else {
          this.buffer[byte] |= pageShift;
        }

        // Track dirty bytes
        if (!this.dirtyBytes.includes(byte)) {
          this.dirtyBytes.push(byte);
        }
      });

      if (sync) {
        await this._updateDirtyBytes(this.dirtyBytes);
      }
    } catch (err) {
      this.logger.error('Error drawing pixels:', err);
      throw err;
    }
  };

  // Draw a line using Bresenham's line algorithm
  drawLine = async (x0, y0, x1, y1, color, sync = true) => {
    const dx = Math.abs(x1 - x0),
          sx = x0 < x1 ? 1 : -1;
    const dy = Math.abs(y1 - y0),
          sy = y0 < y1 ? 1 : -1;
    let err = (dx > dy ? dx : -dy) / 2;

    while (true) {
      await this.drawPixel([x0, y0, color], false);

      if (x0 === x1 && y0 === y1) break;

      const e2 = err;

      if (e2 > -dx) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dy) {
        err += dx;
        y0 += sy;
      }
    }

    if (sync) {
      await this._updateDirtyBytes(this.dirtyBytes);
    }
  };

  // Draw a filled rectangle
  fillRect = async (x, y, w, h, color, sync = true) => {
    // One iteration for each column of the rectangle
    for (let i = x; i < x + w; i += 1) {
      // Draw a vertical line
      await this.drawLine(i, y, i, y + h - 1, color, false);
    }
    if (sync) {
      await this._updateDirtyBytes(this.dirtyBytes);
    }
  };

  // Write text to the display
  writeString = async (font, size, string, color, wrap, sync) => {
    const immed = typeof sync === 'undefined' ? true : sync;
    const wordArr = string.split(' ');
    const len = wordArr.length;
    // Start x offset at cursor pos
    let offset = this.cursor_x;

    // Loop through words
    for (let w = 0; w < len; w += 1) {
      // Put the word space back in for all in between words or empty words
      if (w < len - 1 || !wordArr[w].length) {
        wordArr[w] += ' ';
      }
      const stringArr = wordArr[w].split('');
      const slen = stringArr.length;
      const compare = font.width * size * slen + size * (len - 1);

      // Wrap words if necessary
      if (wrap && len > 1 && w > 0 && offset >= this.WIDTH - compare) {
        offset = 0;
        this.cursor_y += font.height * size + this.LINESPACING;
        this.setCursor(offset, this.cursor_y);
      }

      // Loop through the array of each char to draw
      for (let i = 0; i < slen; i += 1) {
        if (stringArr[i] === '\n') {
          offset = 0;
          this.cursor_y += font.height * size + this.LINESPACING;
          this.setCursor(offset, this.cursor_y);
        } else {
          // Look up the position of the char, pull out the buffer slice
          const charBuf = this._findCharBuf(font, stringArr[i]);
          // Read the bits in the bytes that make up the char
          const charBytes = this._readCharBytes(charBuf, font.height);
          // Draw the entire character
          await this._drawChar(charBytes, font.height, size, false);

          // Calc new x position for the next char, add padding
          offset += font.width * size + this.LETTERSPACING;

          // Wrap letters if necessary
          if (wrap && offset >= this.WIDTH - font.width - this.LETTERSPACING) {
            offset = 0;
            this.cursor_y += font.height * size + this.LINESPACING;
          }
          // Set the 'cursor' for the next char to be drawn
          this.setCursor(offset, this.cursor_y);
        }
      }
    }
    if (immed) {
      await this._updateDirtyBytes(this.dirtyBytes);
    }
  };

  // Draw an RGBA image (optimized)
  drawRGBAImage = async (image, dx, dy, sync) => {
    try {
      const immed = sync ?? true;
      
      // Pre-calculate constants to avoid repeated calculations
      const dyp = this.WIDTH * Math.floor(dy / 8);
      const dxyp = dyp + dx;
      const imageWidth = image.width;
      const imageHeight = image.height;
      const dirtySet = new Set(); // Use Set for more efficient uniqueness check
      
      // Process image data by columns
      for (let x = 0; x < imageWidth; x++) {
        const dxx = dx + x;
        if (dxx < 0 || dxx >= this.WIDTH) continue;
        
        let buffIndex = x + dxyp;
        let buffByte = this.buffer[buffIndex];
        
        for (let y = 0; y < imageHeight; y++) {
          const dyy = dy + y;
          if (dyy < 0 || dyy >= this.HEIGHT) continue;
          
          const dyyp = Math.floor(dyy / 8);
          
          // Check if start of buffer page
          if (!(dyy & 0x07)) { // Equivalent to (dyy % 8) but faster
            // Check if we need to save previous byte
            if ((x || y) && buffByte !== this.buffer[buffIndex]) {
              this.buffer[buffIndex] = buffByte;
              dirtySet.add(buffIndex);
            }
            // New buffer page
            buffIndex = dx + x + this.WIDTH * dyyp;
            buffByte = this.buffer[buffIndex];
          }
          
          // Process pixel into buffer byte - more efficient indexing
          const dataIndex = ((imageWidth * y) + x) << 2; // 4 bytes per pixel (RGBA)
          
          // Skip transparent pixels
          if (!image.data[dataIndex + 3]) continue;
          
          // Check if any color channel is non-zero
          const bit = image.data[dataIndex] | image.data[dataIndex + 1] | image.data[dataIndex + 2];
          const pixelByte = 1 << (dyy & 0x07); // Equivalent to (dyy - 8 * dyyp) but faster
          
          // Set or clear the bit
          if (bit) {
            buffByte |= pixelByte;
          } else {
            buffByte &= ~pixelByte;
          }
        }
        
        // Save the final byte for this column if changed
        if (buffByte !== this.buffer[buffIndex]) {
          this.buffer[buffIndex] = buffByte;
          dirtySet.add(buffIndex);
        }
      }
      
      // Convert Set to Array and append to dirtyBytes
      this.dirtyBytes.push(...dirtySet);
      
      if (immed) {
        await this._updateDirtyBytes(this.dirtyBytes);
      }
    } catch (err) {
      this.logger.error('Error drawing RGBA image:', err);
      throw err;
    }
  };

  // Draw a bitmap efficiently
  drawBitmap = async (pixels, sync) => {
    try {
      // Use Set for tracking dirty bytes efficiently
      const dirtySet = new Set();
      const pixelLength = pixels.length;
      const width = this.WIDTH;
      
      // Process pixels in chunks for better performance
      const CHUNK_SIZE = 1024; // Process 1KB at a time
      
      for (let chunkStart = 0; chunkStart < pixelLength; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, pixelLength);
        
        // Process this chunk of pixels
        for (let i = chunkStart; i < chunkEnd; i++) {
          const x = Math.floor(i % width);
          const y = Math.floor(i / width);
          
          if (x < 0 || x >= this.WIDTH || y < 0 || y >= this.HEIGHT) {
            continue;
          }
          
          const page = Math.floor(y / 8);
          const byte = x + this.WIDTH * page;
          const pageShift = 0x01 << (y & 0x07);
          
          // Set or clear the pixel
          if (pixels[i]) {
            this.buffer[byte] |= pageShift;
          } else {
            this.buffer[byte] &= ~pageShift;
          }
          
          // Mark as dirty
          dirtySet.add(byte);
        }
      }
      
      // Add dirty bytes to the tracking array
      this.dirtyBytes.push(...dirtySet);
      
      if (sync) {
        await this._updateDirtyBytes(this.dirtyBytes);
      }
    } catch (err) {
      this.logger.error('Error drawing bitmap:', err);
      throw err;
    }
  };

  /* ##################################################################################################
   * Common helper methods
   * ##################################################################################################
   */

  // Draw an individual character to the screen
  _drawChar = async (byteArray, charHeight, size, _sync) => {
    // Take your positions...
    const x = this.cursor_x,
          y = this.cursor_y;

    // Loop through the byte array containing the hexes for the char
    for (let i = 0; i < byteArray.length; i += 1) {
      for (let j = 0; j < charHeight; j += 1) {
        // Pull color out
        const color = byteArray[i][j];
        let xpos, ypos;
        // Standard font size
        if (size === 1) {
          xpos = x + i;
          ypos = y + j;
          await this.drawPixel([xpos, ypos, color], false);
        } else {
          // MATH! Calculating pixel size multiplier to primitively scale the font
          xpos = x + i * size;
          ypos = y + j * size;
          await this.fillRect(xpos, ypos, size, size, color, false);
        }
      }
    }
  };

  // Get character bytes from the supplied font object
  _readCharBytes = (byteArray, charHeight) => {
    let bitArr = [];
    const bitCharArr = [];
    // Loop through each byte supplied for a char
    for (let i = 0; i < byteArray.length; i += 1) {
      // Set current byte
      const byte = byteArray[i];
      // Read each byte
      for (let j = 0; j < charHeight; j += 1) {
        // Shift bits right until all are read
        const bit = (byte >> j) & 1;
        bitArr.push(bit);
      }
      // Push to array containing flattened bit sequence
      bitCharArr.push(bitArr);
      // Clear bits for next byte
      bitArr = [];
    }
    return bitCharArr;
  };

  // Find where the character exists within the font object
  _findCharBuf = (font, c) => {
    // Use the lookup array as a ref to find where the current char bytes start
    const cBufPos = font.lookup.indexOf(c) * font.width;
    // Slice just the current char's bytes out of the fontData array and return
    const cBuf = font.fontData.slice(cBufPos, cBufPos + font.width);
    return cBuf;
  };

  /* ##################################################################################################
   * Common I2C communication methods
   * ##################################################################################################
   */

  // Writes both commands and data buffers to this device
  _transfer = async (type, val) => {
    let control;
    if (type === 'data') {
      control = 0x40;
    } else if (type === 'cmd') {
      control = 0x00;
    } else {
      return;
    }

    const bufferForSend = Buffer.from([control, val]);

    // Send control and actual val
    await this.wire.i2cWrite(this.ADDRESS, 2, bufferForSend);
  };

  // Batch multiple commands or data values into a single I2C transfer for better efficiency
  _transferBatch = async (type, values) => {
    const control = type === 'data' ? 0x40 : 0x00;
    
    // Create buffer large enough for all commands (control byte + value for each command)
    const buffer = Buffer.alloc(values.length * 2);
    
    // Fill buffer with alternating control bytes and command/data bytes
    for (let i = 0; i < values.length; i++) {
      buffer[i * 2] = control;
      buffer[i * 2 + 1] = values[i];
    }
    
    // Send all commands in a single I2C transaction
    await this.wire.i2cWrite(this.ADDRESS, buffer.length, buffer);
  };

  // Read a byte from the oled
  _readI2C = async () => {
    const buffer = Buffer.alloc(1);
    const { bytesRead, buffer: data } = await this.wire.i2cRead(
      this.ADDRESS,
      1,
      buffer
    );
    return bytesRead > 0 ? data[0] : 0;
  };

  // Sometimes the oled gets a bit busy with lots of bytes.
  // Read the response byte to see if this is the case
  _waitUntilReady = async () => {
    const tick = async () => {
      const byte = await this._readI2C();
      const busy = (byte >> 7) & 1;
      if (!busy) {
        return;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await tick();
      }
    };
    await tick();
  };

  /* ##################################################################################################
   * Methods that must be implemented by derived classes
   * ##################################################################################################
   */

  // These methods must be implemented by derived classes
  _initialise() {
    throw new Error('_initialise method must be implemented by derived class');
  }

  update() {
    throw new Error('update method must be implemented by derived class');
  }

  _updateDirtyBytes() {
    throw new Error('_updateDirtyBytes method must be implemented by derived class');
  }
}

export default BaseOLED;