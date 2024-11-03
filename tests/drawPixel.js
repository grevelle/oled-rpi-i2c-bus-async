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
        await oled.drawPixel([
            [0, 0, 1],
            [WIDTH - 1, 0, 1],
            [0, HEIGHT - 1, 1],
            [WIDTH - 1, HEIGHT - 1, 1]
        ], true);

        setTimeout(async () => {
            await oled.clearDisplay(true);
        }, 4000);

        setTimeout(async () => {
            let x = 0, y = 0;
            await oled.drawPixel([x, y, 1], true);
            setInterval(async () => {
                await oled.drawPixel([x, y, 0], false);
                if ((x + 1) % WIDTH === 0) {
                    y = (y + 1) % HEIGHT;
                }
                x = (x + 1) % WIDTH;
                await oled.drawPixel([x, y, 1], true);
            }, 10);
        }, 5000);
    } catch (err) {
        console.log(err.message);
        process.exit(1);
    }
};

initializeDisplay();