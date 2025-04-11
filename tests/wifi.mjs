/**
 * Example demonstrating WiFi icon functionality
 * @fileoverview WiFi signal strength indicator example for OLED display
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

let percentage = 0;

/**
 * Initialize the display and show WiFi signal strength indicator
 * @async
 */
const initializeDisplay = async () => {
  try {
    const i2cBus = await i2c.openPromisified(opts.bus ?? 3);
    const oled = new SSD1306(i2cBus, opts);

    await oled.clearDisplay(true);
    await oled.wifi(5, 4, percentage);
    setInterval(() => update(oled), 1000);
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

/**
 * Update the WiFi signal strength indicator with new percentage value
 * @async
 * @param {Object} oled - The OLED display instance
 */
const update = async (oled) => {
  percentage = (percentage + 20) % 100;
  await oled.wifi(5, 4, percentage);
};

initializeDisplay();
