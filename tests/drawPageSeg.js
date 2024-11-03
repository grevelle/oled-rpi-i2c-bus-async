import i2c from 'i2c-bus';
import SSD1306 from '../oled.mjs';

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

        let p = 0, s = 0;
        await oled.drawPageSeg(p, s, 0xFF, true);

        setInterval(async () => {
            await oled.drawPageSeg(p, s, 0x00, false);
            if (s + 1 >= WIDTH) {
                p = (p + 1) % 8;
            }
            s = (s + 1) % WIDTH;
            await oled.drawPageSeg(p, s, 0xFF, true);
        }, 10);
    } catch (err) {
        console.log(err.message);
        process.exit(1);
    }
};

initializeDisplay();