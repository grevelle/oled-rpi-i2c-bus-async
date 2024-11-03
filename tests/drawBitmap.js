import i2c from 'i2c-bus';
import SSD1306 from '../oled.mjs';
import { parseFile } from 'pngparse';
import path from 'path';

const HEIGHT = 64;
const WIDTH = 128;
const opts = {
    width: WIDTH,
    height: HEIGHT,
    address: 0x3C,
    bus: 3,
    driver: 'SH1106'
};

const initializeDisplay = async () => {
    try {
        const i2cBus = await i2c.openPromisified(opts.bus || 3);
        const oled = new SSD1306(i2cBus, opts);

        await oled.clearDisplay(true);
        const imageFile = path.join(__dirname, '../../resources', 'icon_128x64_kiss.png');

        parseFile(imageFile, async (err, image) => {
            if (err) {
                console.log(err.message);
                process.exit(1);
            }
            await oled.drawBitmap(image.data, true);
        });
    } catch (err) {
        console.log(err.message);
        process.exit(1);
    }
};

initializeDisplay();