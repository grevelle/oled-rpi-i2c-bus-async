/**
 * Example demonstrating RGBA image drawing functionality
 * @fileoverview RGBA image drawing example for OLED display
 */
import i2c from 'i2c-bus';
import SSD1306 from '../oled.mjs';
import path from 'path';
import fs from 'fs';
import { PNG } from 'pngjs';

const dirresources = path.join(__dirname, '../..', 'resources/');
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
 * Initialize the display and draw an RGBA image
 * @async
 */
const initializeDisplay = async () => {
  try {
    const i2cBus = await i2c.openPromisified(opts.bus ?? 3);
    const oled = new SSD1306(i2cBus, opts);

    await oled.clearDisplay(true);
    const piLogo = 'rpi-frambuesa.png';
    let image;
    if (typeof piLogo === 'string' && !piLogo.includes('/')) {
      image = dirresources + piLogo;
    } else {
      console.log('Invalid image filename');
      process.exit(1);
    }
    if (!fs.statSync(image).isFile()) {
      console.log('file ' + image + ' not exist.');
      process.exit(1);
    }

    fs.createReadStream(image)
      .pipe(new PNG({ filterType: 4 }))
      .on('parsed', async function () {
        await oled.drawRGBAImage(
          this,
          Math.floor((WIDTH - this.width) / 2), // x-pos center width
          Math.floor((HEIGHT - this.height) / 2), // y-pos center height
          true
        );
      });
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

initializeDisplay();