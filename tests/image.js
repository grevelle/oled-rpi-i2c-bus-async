import i2c from 'i2c-bus';
import SSD1306 from '../oled.mjs';
import font from 'oled-font-pack';

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
        await oled.image(0, 0, "WaterBrain.png", font.oled_5x7, false, false, true, false);
        
        setTimeout(async () => {
            await oled.image(0, 0, "", font.oled_5x7, true, true, false, false);
            await oled.image(30, 3, "rpi-frambuesa.png", font.oled_5x7, true, false, false, false);
        }, 5000);
    } catch (err) {
        console.log(err.message);
        process.exit(1);
    }
};

initializeDisplay();