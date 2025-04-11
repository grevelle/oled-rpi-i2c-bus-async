/**
 * Example demonstrating rectangle filling functionality
 * @fileoverview Rectangle filling example for OLED display
 */
import i2c from 'i2c-bus';
import SSD1306 from '../oled.mjs';

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
 * Initialize the display and draw filled rectangles
 * @async
 */
const initializeDisplay = async () => {
  try {
    const i2cBus = await i2c.openPromisified(opts.bus ?? 3);
    const oled = new SSD1306(i2cBus, opts);

    await oled.clearDisplay(true);

    await oled.fillRect(0, 0, 7, 5, 1, false);
    await oled.fillRect(WIDTH - 7, 0, 7, 5, 1, false);
    await oled.fillRect(0, HEIGHT - 5, 7, 5, 1, false);
    await oled.fillRect(WIDTH - 7, HEIGHT - 5, 7, 5, 1, false);

    await oled.fillRect(7, 5, 114, 54, 1, true);
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

initializeDisplay();
