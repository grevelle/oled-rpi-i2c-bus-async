/**
 * Example demonstrating writing strings to the OLED display
 * with different fonts and sizes
 * @fileoverview Display text example for OLED display
 */
import i2c from 'i2c-bus';
import SSD1306 from '../oled.mjs';
import font from 'oled-font-pack';

const HEIGHT = 64;
const WIDTH = 128;
const opts = {
  width: WIDTH,
  height: HEIGHT,
  address: 0x3c,
  bus: 3,
  driver: 'SH1106',
};

/**
 * Initialize the display and write text with different fonts and sizes
 * @async
 */
const initializeDisplay = async () => {
  try {
    const i2cBus = await i2c.openPromisified(opts.bus ?? 3);
    const oled = new SSD1306(i2cBus, opts);

    await oled.clearDisplay(true);

    await oled.setCursor(10, 0);
    await oled.writeString(font.oled_5x7, 1, 'Hello', 1, false, false);
    await oled.setCursor(10, 10);
    await oled.writeString(font.oled_5x7, 2, 'Hello', 1, false, false);
    await oled.setCursor(10, 40);
    await oled.writeString(font.oled_3x5, 1, 'Hello', 1, false, false);
    await oled.setCursor(10, 50);
    await oled.writeString(font.oled_3x5, 2, 'Hello', 1, false, false);
    await oled.setCursor(70, 40);
    await oled.writeString(font.oled_3x5, 3, 'Hello', 1, false, true);
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

initializeDisplay();