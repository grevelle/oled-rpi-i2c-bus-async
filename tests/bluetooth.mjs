/**
 * Example demonstrating bluetooth icon functionality
 * @fileoverview Bluetooth icon example for OLED display
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
 * Initialize the display and show bluetooth icon
 * @async
 */
const initializeDisplay = async () => {
  try {
    const i2cBus = await i2c.openPromisified(opts.bus ?? 3);
    const oled = new SSD1306(i2cBus, opts);

    await oled.clearDisplay(true);
    await oled.bluetooth(5, 4);
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

initializeDisplay();