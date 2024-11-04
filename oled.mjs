import SSD1306 from './drivers/ssd1306.mjs';
import SH1106 from './drivers/sh1106.mjs';
import fs from 'fs';
import { PNG } from 'pngjs';

let pdxb = null;
let pdyb = null;
const timers = [];

class Oled {
	constructor(i2c, opts) {
		this.DRIVER = opts.driver || 'SSD1306';
		this.HEIGHT = opts.height || 64;
		this.WIDTH = opts.width || 128;

		switch (this.DRIVER) {
			case 'SSD1306':
				this.api = new SSD1306(i2c, opts);
				break;
			case 'SH1106':
				this.api = new SH1106(i2c, opts);
				break;
			default:
				throw new Error('Unknown Driver');
		}
	}

	/* ######################################################################
	 * OLED Controls
	 * ######################################################################
	 */

	// Asynchronous method to turn on the display
	turnOnDisplay = async () => {
		await this.api.turnOnDisplay();
	};

	// Asynchronous method to turn off the display
	turnOffDisplay = async () => {
		await this.api.turnOffDisplay();
	};

	// Asynchronous method to dim the display
	dimDisplay = async (bool) => {
		await this.api.dimDisplay(bool);
	};

	// Method to invert pixels on oled
	invertDisplay = async (bool) => {
		await this.api.invertDisplay(bool);
	};

	// Method to activate scrolling for rows start through stop
	startScroll = async (dir, start, stop) => {
		await this.api.startScroll(dir, start, stop);
	};

	// Method to stop scrolling display contents
	stopScroll = async () => {
		await this.api.stopScroll();
	};

	// Asynchronous method to send the entire framebuffer to the oled
	update = async () => {
		// wait for oled to be ready
		await this.api.update();
	};

	/* ######################################################################
	 * OLED Drawings
	 * ######################################################################
	 */

	// Method to clear all pixels currently on the display
	clearDisplay = async (sync) => {
		await this.api.clearDisplay(sync);
	};

	// Method to set starting position of a text string on the oled
	setCursor = async (x, y) => {
		await this.api.setCursor(x, y);
	};

	// Method to draw a column of a page on the oled
	drawPageCol = async (page, col, byte) => {
		await this.api.drawPageCol(page, col, byte);
	};

	// Method to draw a segment of a page on the oled
	drawPageSeg = async (page, seg, byte, sync) => {
		await this.api.drawPageSeg(page, seg, byte, sync);
	};

	// Method to draw one or many pixels on oled
	drawPixel = async (pixels, sync) => {
		await this.api.drawPixel(pixels, sync);
	};

	// Method to draw a line using Bresenham's line algorithm
	drawLine = async (x0, y0, x1, y1, color, sync) => {
		await this.api.drawLine(x0, y0, x1, y1, color, sync);
	};

	// Method to draw a filled rectangle on the oled
	fillRect = async (x, y, w, h, color, sync) => {
		await this.api.fillRect(x, y, w, h, color, sync);
	};

	// Method to write text to the oled
	writeString = async (font, size, string, color, wrap, sync) => {
		await this.api.writeString(font, size, string, color, wrap, sync);
	};

	// Method to draw an RGBA image at the specified coordinates
	drawRGBAImage = async (image, dx, dy, sync) => {
		await this.api.drawRGBAImage(image, dx, dy, sync);
	};

	// Method to draw an image pixel array on the screen
	drawBitmap = async (pixels, sync) => {
		await this.api.drawBitmap(pixels, sync);
	};

	/* ######################################################################
	 * OLED Shape/Indicators
	 * ######################################################################
	 */

	// Method to draw a battery icon on the oled
	battery = async (x, y, percentage) => {
		await this.drawLine(x, y, x + 16, y, 1);
		await this.drawLine(x, y + 8, x + 16, y + 8, 1);
		await this.drawLine(x, y, x, y + 8, 1);
		await this.drawPixel([
			[x + 17, y + 1, 1],
			[x + 17, y + 7, 1],
		]);
		await this.drawLine(x + 18, y + 1, x + 18, y + 7, 1);

		if (percentage >= 70) {
			await this.fillRect(x + 2, y + 2, 3, 5, 1, false);
			await this.fillRect(x + 7, y + 2, 3, 5, 1, false);
			await this.fillRect(x + 12, y + 2, 3, 5, 1, true);
		}

		if (percentage >= 40 && percentage < 70) {
			await this.fillRect(x + 2, y + 2, 3, 5, 1, false);
			await this.fillRect(x + 7, y + 2, 3, 5, 1, false);
			await this.fillRect(x + 12, y + 2, 3, 5, 0, true);
		}

		if (percentage >= 10 && percentage < 40) {
			await this.fillRect(x + 2, y + 2, 3, 5, 1, false);
			await this.fillRect(x + 7, y + 2, 3, 5, 0, false);
			await this.fillRect(x + 12, y + 2, 3, 5, 0, true);
		}

		if (percentage < 10) {
			await this.fillRect(x + 2, y + 2, 3, 5, 0, false);
			await this.fillRect(x + 7, y + 2, 3, 5, 0, false);
			await this.fillRect(x + 12, y + 2, 3, 5, 0, true);
		}
	};

	// Method to draw a bluetooth icon on the oled
	bluetooth = async (x, y) => {
		await this.drawLine(x + 5, y + 1, x + 5, y + 11, 1);
		await this.drawLine(x + 2, y + 3, x + 9, y + 8, 1);
		await this.drawLine(x + 2, y + 9, x + 8, y + 3, 1);
		await this.drawLine(x + 5, y + 1, x + 9, y + 3, 1);
		await this.drawLine(x + 5, y + 11, x + 8, y + 9, 1);
	};

	// Method to draw a wifi icon on the oled
	wifi = async (x, y, percentage) => {
		await this.drawLine(x, y, x + 8, y, 1);
		await this.drawLine(x, y, x + 4, y + 4, 1);
		await this.drawLine(x + 8, y, x + 4, y + 4, 1);
		await this.drawLine(x + 4, y, x + 4, y + 9, 1);

		if (percentage >= 70) {
			await this.fillRect(x + 6, y + 8, 2, 2, 1, true);
			await this.fillRect(x + 10, y + 6, 2, 4, 1, true);
			await this.fillRect(x + 14, y + 4, 2, 6, 1, true);
		}

		if (percentage >= 40 && percentage < 70) {
			await this.fillRect(x + 6, y + 8, 2, 2, 1, true);
			await this.fillRect(x + 10, y + 6, 2, 4, 1, true);
			await this.fillRect(x + 14, y + 4, 2, 6, 0, true);
		}

		if (percentage >= 10 && percentage < 40) {
			await this.fillRect(x + 6, y + 8, 2, 2, 1, true);
			await this.fillRect(x + 10, y + 6, 2, 4, 0, true);
			await this.fillRect(x + 14, y + 4, 2, 6, 0, true);
		}

		if (percentage < 10) {
			await this.fillRect(x + 6, y + 8, 2, 2, 0, true);
			await this.fillRect(x + 10, y + 6, 2, 4, 0, true);
			await this.fillRect(x + 14, y + 4, 2, 6, 0, true);
		}
	};

	image = async (x, y, image, font, clear, reset, animated, wrapping) => {
		const dirresources = __dirname + '/resources/';

		if (typeof reset === 'boolean' && reset) {
			timers.forEach((entry) => {
				clearInterval(entry);
				entry = null;
			});
			timers.length = 0;
			if (typeof clear === 'boolean' && clear) {
				await this.clearDisplay();
			}
			if (typeof pdxb === 'number') {
				pdxb = null;
			}
			if (typeof pdyb === 'number') {
				pdyb = null;
			}
			return;
		}

		if (typeof image === 'string' && !image.includes('/')) {
			tryImage = image;
			image = dirresources + image;
		}

		try {
			if (!fs.statSync(image).isFile()) {
				console.log('file ' + image + ' not exist.');
			}
		} catch (err) {
			image = dirresources + 'notafile.png';
			x = 0;
			y = 17;
			await this.clearDisplay();
			await this.writeString(font, 1, tryImage, 1, wrapping);
		}

		if (typeof clear === 'boolean' && clear) {
			await this.clearDisplay();
		}

		try {
			const _oled = this;
			fs.createReadStream(image)
				.pipe(new PNG({ filterType: 4 }))
				.on('parsed', async function () {
					if (typeof animated === 'boolean' && animated) {
						pdxb = 1;
						pdyb = -1;
						try {
							let myInterval = setInterval(async () => {
								await _oled._drawPseudo(_oled, clear, this, pdxb, pdyb);
							}, 10);
							timers.push(myInterval);
						} catch (e) {
							console.log(e);
						}
					} else {
						await _oled.api.drawRGBAImage(
							this,
							x || Math.floor((_oled.WIDTH - this.width) / 2),
							y || Math.floor((_oled.HEIGHT - this.height) / 2),
							true
						);
					}
				});
		} catch (err) {
			console.error(err);
		}
	};

	_drawPseudo = async (display, clear, image, pdxb, pdyb) => {
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
			this._drawPseudo.dx = pdxb;
			this._drawPseudo.dy = pdyb;
		}
		if (clear) {
			await display.fillRect(0, 0, display.WIDTH, display.HEIGHT, 1, true);
			await display.fillRect(
				1,
				1,
				display.WIDTH - 2,
				display.HEIGHT - 2,
				0,
				true
			);
		} else {
			await display.fillRect(
				this._drawPseudo.prevX,
				this._drawPseudo.prevY,
				image.width,
				image.height,
				0,
				false
			);
			this._drawPseudo.prevX = this._drawPseudo.x;
			this._drawPseudo.prevY = this._drawPseudo.y;
		}

		await display.drawRGBAImage(
			image,
			this._drawPseudo.x,
			this._drawPseudo.y,
			true
		);
		if (
			this._drawPseudo.x + this._drawPseudo.dx > display.WIDTH - image.width ||
			this._drawPseudo.x < 1
		) {
			this._drawPseudo.dx = -this._drawPseudo.dx;
		}
		if (
			this._drawPseudo.y + this._drawPseudo.dy >
				display.HEIGHT - image.height ||
			this._drawPseudo.y < 1
		) {
			this._drawPseudo.dy = -this._drawPseudo.dy;
		}

		this._drawPseudo.x += this._drawPseudo.dx;
		this._drawPseudo.y += this._drawPseudo.dy;
	};
}

export default Oled;
