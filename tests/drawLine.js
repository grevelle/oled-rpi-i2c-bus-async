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

const initializeDisplay = async () => {
	try {
		const i2cBus = await i2c.openPromisified(opts.bus || 3);
		const oled = new SSD1306(i2cBus, opts);

		await oled.clearDisplay(true);

		await oled.drawLine(0, 0, WIDTH - 1, 0, 1, false);
		await oled.drawLine(0, HEIGHT - 1, WIDTH - 1, HEIGHT - 1, 1, false);
		await oled.drawLine(0, 1, 0, HEIGHT - 2, 1, true);
		await oled.drawLine(WIDTH - 1, 1, WIDTH - 1, HEIGHT - 2, 1, false);

		await oled.drawLine(1, 1, WIDTH - 2, HEIGHT - 2, 1, false);
		await oled.drawLine(WIDTH - 2, 2, 2, HEIGHT - 2, 1, true);
	} catch (err) {
		console.log(err.message);
		process.exit(1);
	}
};

initializeDisplay();
