class SSD1306 {
	constructor(i2c, opts) {
		this.HEIGHT = opts.height || 64;
		this.WIDTH = opts.width || 128;
		this.ADDRESS = opts.address || 0x3c;

		this.MAX_PAGE_COUNT = this.HEIGHT / 8;
		this.LINESPACING = opts.linespacing ?? 1;
		this.LETTERSPACING = opts.letterspacing ?? 1;

		// create command buffers
		this.DISPLAY_OFF = 0xae;
		this.DISPLAY_ON = 0xaf;
		this.SET_DISPLAY_CLOCK_DIV = 0xd5;
		this.SET_MULTIPLEX = 0xa8;
		this.SET_DISPLAY_OFFSET = 0xd3;
		this.SET_START_LINE = 0x00;
		this.CHARGE_PUMP = 0x8d;
		this.EXTERNAL_VCC = false;
		this.MEMORY_MODE = 0x20;
		this.SEG_REMAP = 0xa1;
		this.COM_SCAN_DEC = 0xc8;
		this.COM_SCAN_INC = 0xc0;
		this.SET_COM_PINS = 0xda;
		this.SET_CONTRAST = 0x81;
		this.SET_PRECHARGE = 0xd9;
		this.SET_VCOM_DETECT = 0xdb;
		this.DISPLAY_ALL_ON_RESUME = 0xa4;
		this.NORMAL_DISPLAY = 0xa6;
		this.COLUMN_ADDR = 0x21;
		this.PAGE_ADDR = 0x22;
		this.INVERT_DISPLAY = 0xa7;
		this.ACTIVATE_SCROLL = 0x2f;
		this.DEACTIVATE_SCROLL = 0x2e;
		this.SET_VERTICAL_SCROLL_AREA = 0xa3;
		this.RIGHT_HORIZONTAL_SCROLL = 0x26;
		this.LEFT_HORIZONTAL_SCROLL = 0x27;
		this.VERTICAL_AND_RIGHT_HORIZONTAL_SCROLL = 0x29;
		this.VERTICAL_AND_LEFT_HORIZONTAL_SCROLL = 0x02;
		this.SET_CONTRAST_CTRL_MODE = 0x81;

		this.cursor_x = 0;
		this.cursor_y = 0;

		// new blank buffer (1 byte per pixel)
		this.buffer = Buffer.alloc((this.WIDTH * this.HEIGHT) / 8);
		this.buffer.fill(0xff);
		this.dirtyBytes = [];

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

		this.wire = i2c;
		const screenSize = `${this.WIDTH}x${this.HEIGHT}`;
		this.screenConfig = config[screenSize];
		this._initialise();
	}

	/* ##################################################################################################
	 * OLED controls
	 * ##################################################################################################
	 */
	// Turn OLED on
	turnOnDisplay = async () => {
		await this._transfer('cmd', this.DISPLAY_ON);
	};

	// Turn OLED on
	turnOnDisplay = async () => {
		await this._transfer('cmd', this.DISPLAY_ON);
	};

	// Send dim display command to oled
	dimDisplay = async (bool) => {
		const contrast = bool ? 0 : 0xff; // Dimmed display if true, bright display if false

		await this._transfer('cmd', this.SET_CONTRAST_CTRL_MODE);
		await this._transfer('cmd', contrast);
	};

	// Invert pixels on oled
	invertDisplay = async (bool) => {
		if (bool) {
			await this._transfer('cmd', this.INVERT_DISPLAY); // inverted
		} else {
			await this._transfer('cmd', this.NORMAL_DISPLAY); // non inverted
		}
	};

	// Activate scrolling for rows start through stop
	startScroll = async (dir, start, stop) => {
		let scrollHeader,
			cmdSeq = [];

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
			// TODO: left diag and right diag not working yet
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

		for (let i = 0; i < cmdSeq.length; i++) {
			await this._transfer('cmd', cmdSeq[i]);
		}
	};

	// Stop scrolling display contents
	stopScroll = async () => {
		await this._transfer('cmd', this.DEACTIVATE_SCROLL); // stahp
	};

	// send the entire framebuffer to the oled
	update = async () => {
		// wait for oled to be ready
		await this._waitUntilReady();

		// set the start and end byte locations for oled display update
		const displaySeq = [
			this.COLUMN_ADDR,
			this.screenConfig.coloffset,
			this.screenConfig.coloffset + this.WIDTH - 1, // column start and end address
			this.PAGE_ADDR,
			0,
			this.HEIGHT / 8 - 1, // page start and end address
		];

		// send intro seq
		for (let i = 0; i < displaySeq.length; i++) {
			await this._transfer('cmd', displaySeq[i]);
		}

		// write buffer data
		const bufferToSend = Buffer.concat([Buffer.from([0x40]), this.buffer]);
		await this.wire.i2cWrite(this.ADDRESS, bufferToSend.length, bufferToSend);
	};

	/* ##################################################################################################
	 * OLED drawings
	 * ##################################################################################################
	 */

	// clear all pixels currently on the display
	clearDisplay = async (sync) => {
		for (let i = 0; i < this.buffer.length; i += 1) {
			if (this.buffer[i] !== 0x00) {
				this.buffer[i] = 0x00;
				if (!this.dirtyBytes.includes(i)) {
					this.dirtyBytes.push(i);
				}
			}
		}
		if (sync) {
			await this._updateDirtyBytes(this.dirtyBytes);
		}
	};

	// set starting position of a text string on the oled
	setCursor = (x, y) => {
		this.cursor_x = x;
		this.cursor_y = y;
	};

	// buffer/ram test
	drawPageSeg = async (page, seg, byte, sync) => {
		if (
			page < 0 ||
			page >= this.MAX_PAGE_COUNT ||
			seg < 0 ||
			seg >= this.WIDTH
		) {
			return;
		}

		// wait for oled to be ready
		await this._waitUntilReady();

		// set the start and end byte locations for oled display update
		const bufferIndex = seg + page * this.WIDTH;
		this.buffer[bufferIndex] = byte;

		if (!this.dirtyBytes.includes(bufferIndex)) {
			this.dirtyBytes.push(bufferIndex);
		}

		if (sync) {
			await this._updateDirtyBytes(this.dirtyBytes);
		}
	};

	// draw one or many pixels on oled
	drawPixel = async (pixels, sync) => {
		// handle lazy single pixel case
		if (typeof pixels[0] !== 'object') {
			pixels = [pixels];
		}

		pixels.forEach((el) => {
			// return if the pixel is out of range
			const x = el[0];
			const y = el[1];
			const color = el[2];

			if (x < 0 || x >= this.WIDTH || y < 0 || y >= this.HEIGHT) {
				return;
			}

			let byte = 0;
			const page = Math.floor(y / 8);
			const pageShift = 0x01 << (y - 8 * page);

			// is the pixel on the first row of the page?
			if (page === 0) {
				byte = x;
			} else {
				byte = x + this.WIDTH * page;
			}

			// colors! Well, monochrome.
			if (color === 'BLACK' || !color) {
				this.buffer[byte] &= ~pageShift;
			} else if (color === 'WHITE' || color) {
				this.buffer[byte] |= pageShift;
			}

			// push byte to dirty if not already there
			if (!this.dirtyBytes.includes(byte)) {
				this.dirtyBytes.push(byte);
			}
		});

		if (sync) {
			await this._updateDirtyBytes(this.dirtyBytes);
		}
	};

	// using Bresenham's line algorithm
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

	// draw a filled rectangle on the oled
	fillRect = async (x, y, w, h, color, sync = true) => {
		// one iteration for each column of the rectangle
		for (let i = x; i < x + w; i += 1) {
			// draws a vert line
			await this.drawLine(i, y, i, y + h - 1, color, false);
		}
		if (sync) {
			await this._updateDirtyBytes(this.dirtyBytes);
		}
	};

	// write text to the oled
	writeString = async (font, size, string, color, wrap, sync) => {
		const immed = typeof sync === 'undefined' ? true : sync;
		const wordArr = string.split(' ');
		const len = wordArr.length;
		// start x offset at cursor pos
		let offset = this.cursor_x;

		// loop through words
		for (let w = 0; w < len; w += 1) {
			// put the word space back in for all in between words or empty words
			if (w < len - 1 || !wordArr[w].length) {
				wordArr[w] += ' ';
			}
			const stringArr = wordArr[w].split('');
			const slen = stringArr.length;
			const compare = font.width * size * slen + size * (len - 1);

			// wrap words if necessary
			if (wrap && len > 1 && w > 0 && offset >= this.WIDTH - compare) {
				offset = 0;
				this.cursor_y += font.height * size + this.LINESPACING;
				this.setCursor(offset, this.cursor_y);
			}

			// loop through the array of each char to draw
			for (let i = 0; i < slen; i += 1) {
				if (stringArr[i] === '\n') {
					offset = 0;
					this.cursor_y += font.height * size + this.LINESPACING;
					this.setCursor(offset, this.cursor_y);
				} else {
					// look up the position of the char, pull out the buffer slice
					const charBuf = this._findCharBuf(font, stringArr[i]);
					// read the bits in the bytes that make up the char
					const charBytes = this._readCharBytes(charBuf, font.height);
					// draw the entire character
					await this._drawChar(charBytes, font.height, size, false);

					// calc new x position for the next char, add a touch of padding too if it's a non space char
					offset += font.width * size + this.LETTERSPACING;

					// wrap letters if necessary
					if (wrap && offset >= this.WIDTH - font.width - this.LETTERSPACING) {
						offset = 0;
						this.cursor_y += font.height * size + this.LINESPACING;
					}
					// set the 'cursor' for the next char to be drawn, then loop again for next char
					this.setCursor(offset, this.cursor_y);
				}
			}
		}
		if (immed) {
			await this._updateDirtyBytes(this.dirtyBytes);
		}
	};

	// draw an RGBA image at the specified coordinates
	drawRGBAImage = async (image, dx, dy, sync) => {
		const immed = typeof sync === 'undefined' ? true : sync;
		// translate image data to buffer
		let x, y, dataIndex, buffIndex, buffByte, bit, pixelByte;
		const dyp = this.WIDTH * Math.floor(dy / 8); // calc once
		const dxyp = dyp + dx;
		for (x = 0; x < image.width; x++) {
			const dxx = dx + x;
			if (dxx < 0 || dxx >= this.WIDTH) {
				// negative, off the screen
				continue;
			}
			// start buffer index for image column
			buffIndex = x + dxyp;
			buffByte = this.buffer[buffIndex];
			for (y = 0; y < image.height; y++) {
				const dyy = dy + y; // calc once
				if (dyy < 0 || dyy >= this.HEIGHT) {
					// negative, off the screen
					continue;
				}
				const dyyp = Math.floor(dyy / 8); // calc once

				// check if start of buffer page
				if (!(dyy % 8)) {
					// check if we need to save previous byte
					if ((x || y) && buffByte !== this.buffer[buffIndex]) {
						// save current byte and get next buffer byte
						this.buffer[buffIndex] = buffByte;
						this.dirtyBytes.push(buffIndex);
					}
					// new buffer page
					buffIndex = dx + x + this.WIDTH * dyyp;
					buffByte = this.buffer[buffIndex];
				}

				// process pixel into buffer byte
				dataIndex = (image.width * y + x) << 2; // 4 bytes per pixel (RGBA)
				if (!image.data[dataIndex + 3]) {
					// transparent, continue to next pixel
					continue;
				}

				pixelByte = 0x01 << (dyy - 8 * dyyp);
				bit =
					image.data[dataIndex] ||
					image.data[dataIndex + 1] ||
					image.data[dataIndex + 2];
				if (bit) {
					buffByte |= pixelByte;
				} else {
					buffByte &= ~pixelByte;
				}
			}
			if ((x || y) && buffByte !== this.buffer[buffIndex]) {
				// save current byte
				this.buffer[buffIndex] = buffByte;
				this.dirtyBytes.push(buffIndex);
			}
		}

		if (immed) {
			await this._updateDirtyBytes(this.dirtyBytes);
		}
	};

	// draw an image pixel array on the screen
	drawBitmap = async (pixels, sync) => {
		let x;
		let y;

		for (let i = 0; i < pixels.length; i++) {
			x = Math.floor(i % this.WIDTH);
			y = Math.floor(i / this.WIDTH);

			await this.drawPixel([x, y, pixels[i]], false);
		}

		if (sync) {
			await this._updateDirtyBytes(this.dirtyBytes);
		}
	};

	/* ##################################################################################################
	 * Private utilities
	 * ##################################################################################################
	 */

	// Initialize the display
	_initialise = async () => {
		// sequence of bytes to initialise with
		const initSeq = [
			this.DISPLAY_OFF,
			this.SET_DISPLAY_CLOCK_DIV,
			0x80,
			this.SET_MULTIPLEX,
			this.screenConfig.multiplex, // set the last value dynamically based on screen size requirement
			this.SET_DISPLAY_OFFSET,
			0x00, // sets offset pro to 0
			this.SET_START_LINE,
			this.CHARGE_PUMP,
			0x14, // charge pump val
			this.MEMORY_MODE,
			0x00, // 0x0 act like ks0108
			this.SEG_REMAP, // screen orientation
			this.COM_SCAN_DEC, // screen orientation change to INC to flip
			this.SET_COM_PINS,
			this.screenConfig.compins, // com pins val sets dynamically to match each screen size requirement
			this.SET_CONTRAST,
			0x8f, // contrast val
			this.SET_PRECHARGE,
			0xf1, // precharge val
			this.SET_VCOM_DETECT,
			0x40, // vcom detect
			this.DISPLAY_ALL_ON_RESUME,
			this.NORMAL_DISPLAY,
			this.DISPLAY_ON,
		];

		// write init seq commands
		for (let i = 0; i < initSeq.length; i++) {
			await this._transfer('cmd', initSeq[i]);
		}
	};

	// writes both commands and data buffers to this device
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

		// send control and actual val
		await this.wire.i2cWrite(this.ADDRESS, 2, bufferForSend);
	};

	// read a byte from the oled
	_readI2C = async () => {
		const buffer = Buffer.alloc(1);
		const { bytesRead, buffer: data } = await this.wire.i2cRead(
			this.ADDRESS,
			1,
			buffer
		);
		return bytesRead > 0 ? data[0] : 0;
	};

	// sometimes the oled gets a bit busy with lots of bytes.
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

	// draw an individual character to the screen
	_drawChar = async (byteArray, charHeight, size, _sync) => {
		// take your positions...
		const x = this.cursor_x,
			y = this.cursor_y;

		// loop through the byte array containing the hexes for the char
		for (let i = 0; i < byteArray.length; i += 1) {
			for (let j = 0; j < charHeight; j += 1) {
				// pull color out
				const color = byteArray[i][j];
				let xpos, ypos;
				// standard font size
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

	// get character bytes from the supplied font object in order to send to framebuffer
	_readCharBytes = (byteArray, charHeight) => {
		let bitArr = [];
		const bitCharArr = [];
		// loop through each byte supplied for a char
		for (let i = 0; i < byteArray.length; i += 1) {
			// set current byte
			const byte = byteArray[i];
			// read each byte
			for (let j = 0; j < charHeight; j += 1) {
				// shift bits right until all are read
				const bit = (byte >> j) & 1;
				bitArr.push(bit);
			}
			// push to array containing flattened bit sequence
			bitCharArr.push(bitArr);
			// clear bits for next byte
			bitArr = [];
		}
		return bitCharArr;
	};

	// find where the character exists within the font object
	_findCharBuf = (font, c) => {
		// use the lookup array as a ref to find where the current char bytes start
		const cBufPos = font.lookup.indexOf(c) * font.width;
		// slice just the current char's bytes out of the fontData array and return
		const cBuf = font.fontData.slice(cBufPos, cBufPos + font.width);
		return cBuf;
	};

	// looks at dirty bytes, and sends the updated bytes to the display
	_updateDirtyBytes = async (dirtyByteArray) => {
		const dirtyByteArrayLen = dirtyByteArray.length;

		// check to see if this will even save time
		if (dirtyByteArrayLen > this.buffer.length / 7) {
			// just call regular update at this stage, saves on bytes sent
			await this.update();
			// now that all bytes are synced, reset dirty state
			this.dirtyBytes = [];
		} else {
			await this._waitUntilReady();

			// iterate through dirty bytes
			for (let i = 0; i < dirtyByteArrayLen; i += 1) {
				const dirtyByteIndex = dirtyByteArray[i];
				const page = Math.floor(dirtyByteIndex / this.WIDTH);
				const col = Math.floor(dirtyByteIndex % this.WIDTH);

				const displaySeq = [
					this.COLUMN_ADDR,
					col,
					col, // column start and end address
					this.PAGE_ADDR,
					page,
					page, // page start and end address
				];

				// send intro seq
				for (let v = 0; v < displaySeq.length; v += 1) {
					await this._transfer('cmd', displaySeq[v]);
				}
				// send byte, then move on to next byte
				await this._transfer('data', this.buffer[dirtyByteIndex]);
			}
			// now that all bytes are synced, reset dirty state
			this.dirtyBytes = [];
		}
	};
}

export default SSD1306;
