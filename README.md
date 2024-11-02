![npm version](http://img.shields.io/npm/v/oled-rpi-i2c-bus-async.svg?style=flat) ![downloads over month](http://img.shields.io/npm/dm/oled-rpi-i2c-bus-async.svg?style=flat)

Asynchronous OLED JS Pi over i2c-bus
========================

## What is this?

This is a fork of the package [`oled-rpi-i2c-bus`](https://github.com/hadifikri/oled-rpi-i2c-bus), which itself is a fork of [`oled-js-pi`](https://github.com/kd7yva/oled-js-pi). This version works through the `i2c-bus` package and does not use the `i2c` package.

A NodeJS driver for I2C/SPI compatible monochrome OLED screens; to be used on the Raspberry Pi. Works with 128 x 32, 128 x 64, and 96 x 16 sized screens, of the SSD1306/SH1106 OLED/PLED Controller (read the [datasheet here](http://www.adafruit.com/datasheets/SSD1306.pdf)).

This version includes two significant updates:
1. Switched to using the asynchronous methods of the `i2c-bus` package for improved performance and non-blocking operations.
2. Migrated to ES6 modules for modern JavaScript syntax and better module management.

The original code is based on the blog post and code by Suz Hinton.

## Install

Raspberry Pi allows for software I2C. To enable software I2C, add `dtoverlay=i2c-gpio,bus=3` to `/boot.config.txt`. The software I2C would be available on `bus` no `3` 
where the `SDA` is on pin `GPIO23`/`BCM 16` and `SCK` is on pun `GPIO24`/`BCM 18`. 

If you haven't already, install [NodeJS](http://nodejs.org/).

`npm install oled-i2c-bus`

For `SH1106`, if you get an error:
```
"Error: , Remote I/O error"
```

You might have to lower the baudrate by adding the following line to `/boot/config.txt` and rebooting the Pi
```
dtparam=i2c_baudrate=10000
```

This is a known issue with Raspberry Pi as noted in [Raspberry Pi I2C hardware bug](https://github.com/fivdi/i2c-bus/issues/36). Alternatively, use software I2C.

## I2C screens
Hook up I2C compatible oled to the Raspberry Pi. Pins: SDA and SCL

### I2C example

```javascript
import i2c from 'i2c-bus';
import Oled from 'oled-rpi-i2c-bus-async';

const opts = {
  width: 128,
  height: 64,
  address: 0x3D,
  bus: 1,
  driver: "SSD1306"
};

const setupOled = async () => {
  try {
    const i2cBus = await i2c.openPromisified(opts.bus);
    const oled = new Oled(i2cBus, opts);

    // do cool oled things here

  } catch (err) {
    console.error('Error:', err);
  }
};

setupOled();

```

### Wait, how do I find out the I2C address of my OLED screen?
Check your screen's documentation...

## Available methods

### clearDisplay
Fills the buffer with 'off' pixels (0x00). Optional bool argument specifies whether screen updates immediately with result. Default is true.

Usage:
```javascript
await oled.clearDisplay();
```

### dimDisplay
Lowers the contrast on the display. This method takes one argument, a boolean. True for dimming, false to restore normal contrast.

Usage:
```javascript
await oled.dimDisplay(true);
```

### invertDisplay
Inverts the pixels on the display. Black becomes white, white becomes black. This method takes one argument, a boolean. True for inverted state, false to restore normal pixel colors.

Usage:
```javascript
await oled.invertDisplay(true);
```

### turnOffDisplay
Turns the display off.

Usage:
```javascript
await oled.turnOffDisplay();
```

### turnOnDisplay
Turns the display on.

Usage:
```javascript
await oled.turnOnDisplay();
```


### drawPixel
Draws a pixel at a specified position on the display. This method takes one argument: a multi-dimensional array containing either one or more sets of pixels.

Each pixel needs an x position, a y position, and a color. Colors can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.

Optional bool as last argument specifies whether screen updates immediately with result. Default is true.

Usage:
```javascript
// draws 4 white pixels total
// format: [x, y, color]
await oled.drawPixel([
	[128, 1, 1],
	[128, 32, 1],
	[128, 16, 1],
	[64, 16, 1]
]);
```

### drawLine
Draws a one pixel wide line.

Arguments:
+ int **x0, y0** - start location of line
+ int **x1, y1** - end location of line
+ int **color** - can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.

Optional bool as last argument specifies whether screen updates immediately with result. Default is true.

Usage:
```javascript
// args: (x0, y0, x1, y1, color)
await oled.drawLine(1, 1, 128, 32, 1);
```

### fillRect
Draws a filled rectangle.

Arguments:
+ int **x0, y0** - top left corner of rectangle
+ int **w, h** - width and height of rectangle
+ int **color** - can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.

Optional bool as last argument specifies whether screen updates immediately with result. Default is true.

Usage:
```javascript
// args: (x0, y0, x1, y1, color)
await oled.fillRect(1, 1, 10, 20, 1);
```

### drawBitmap
Draws a bitmap using raw pixel data returned from an image parser. The image sourced must be monochrome, and indexed to only 2 colors. Resize the bitmap to your screen dimensions first. Using an image editor or ImageMagick might be required.

Optional bool as last argument specifies whether screen updates immediately with result. Default is true.

Tip: use a NodeJS image parser to get the pixel data, such as [pngparse](https://www.npmjs.org/package/pngparse). A demonstration of using this is below.


Example usage:
```
npm install pngparse
```

```javascript
// Parse the PNG file and draw the bitmap
const image = await new Promise((resolve, reject) => {
  pngparse.parseFile('indexed_file.png', (err, image) => {
    if (err) reject(err);
    else resolve(image);
  });
});

await oled.drawBitmap(image.data);
```

This method is provided as a primitive convenience. A better way to display images is to use NodeJS package [png-to-lcd](https://www.npmjs.org/package/png-to-lcd) instead. It's just as easy to use as drawBitmap, but is compatible with all image depths (lazy is good!). It will also auto-dither if you choose. You should still resize your image to your screen dimensions. This alternative method is covered below:

```
npm install png-to-lcd
```

```javascript
// Convert PNG to LCD bitmap and update the display
const bitmap = await new Promise((resolve, reject) => {
  pngtolcd('nyan-cat.png', true, (err, bitmap) => {
    if (err) reject(err);
    else resolve(bitmap);
  });
});

oled.buffer = bitmap;
await oled.update();
```

### drawRGBAImage
Draw an RGBA coded image at specific coordinates. This only supports a monochrome
OLED so transparent pixels must be 100% transparent, off pixels should have an
RGB value of (0, 0, 0), and pixels with any color value will be considered on.

Use a library such as [pngjs](https://www.npmjs.com/package/pngjs) to read a png
file into the required rgba data structure.

### Example with PNG Stream

```javascript
import fs from 'fs';
import { PNG } from 'pngjs';
import i2c from 'i2c-bus';
import Oled from 'oled-i2c-bus';

const setupOled = async () => {
  const i2cBus = await i2c.openPromisified(0);

  const opts = {
    width: 128,
    height: 64,
    address: 0x3C
  };

  const display = new Oled(i2cBus, opts);

  // Clear the display
  await display.clearDisplay();

  // Turn on the display
  await display.turnOnDisplay();

  // Read and draw the PNG image
  fs.createReadStream('./test.png')
    .pipe(new PNG({ filterType: 4 }))
    .on('parsed', async function () {
      setInterval(async () => {
        await drawImage(this);
      }, 1000);
    });

  const drawImage = async (image) => {
    const x = Math.floor(Math.random() * (display.WIDTH) - image.width / 2);
    const y = Math.floor(Math.random() * (display.HEIGHT) - image.height / 2);
    await display.drawRGBAImage(image, x, y);
  };
};

setupOled();
```


### startScroll
Scrolls the current display either left or right.
Arguments:
+ string **direction** - direction of scrolling. 'left' or 'right'
+ int **start** - starting row of scrolling area
+ int **stop** - end row of scrolling area

Usage:
```javascript
// args: (direction, start, stop)
await oled.startscroll('left', 0, 15); // this will scroll an entire 128 x 32 screen
```

### stopScroll
Stops all current scrolling behaviour.

Usage:
```javascript
await oled.stopscroll();
```

### setCursor
Sets the x and y position of 'cursor', when about to write text. This effectively helps tell the display where to start typing when writeString() method is called.

Call setCursor just before writeString().

Usage:
```javascript
// sets cursor to x = 1, y = 1
await oled.setCursor(1, 1);
```

### writeString
Writes a string of text to the display.  
Call setCursor() just before, if you need to set starting text position.

Arguments:
+ obj **font** - font object in JSON format (see note below on sourcing a font)
+ int **size** - font size, as multiplier. Eg. 2 would double size, 3 would triple etc.
+ string **text** - the actual text you want to show on the display.
+ int **color** - color of text. Can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.
+ bool **wrapping** - true applies word wrapping at the screen limit, false for no wrapping. If a long string without spaces is supplied as the text, just letter wrapping will apply instead.

Optional bool as last argument specifies whether screen updates immediately with result. Default is true.

Before all of this text can happen, you need to load a font buffer for use. A good font to start with is NodeJS package [oled-font-5x7](https://www.npmjs.org/package/oled-font-5x7).

Usage:
```
npm install oled-font-5x7
```

```javascript
import font from 'oled-font-5x7';

// sets cursor to x = 1, y = 1
await oled.setCursor(1, 1);
await oled.writeString(font, 1, 'Cats and dogs are really cool animals, you know.', 1, true);
```

Checkout https://www.npmjs.com/package/oled-font-pack for all-in-one font package.

### update
Sends the entire buffer in its current state to the oled display, effectively syncing the two. This method generally does not need to be called, unless you're messing around with the framebuffer manually before you're ready to sync with the display. It's also needed if you're choosing not to draw on the screen immediately with the built in methods.

Usage:
```javascript
await oled.update();
```

### battery  
Draw a battery level in percentage indicator. This method allows for up to 4 different states of the battery:    
- 0 bar : battery < 10%    
- 1 bar : 10% >= battery < 40%  
- 2 bar : 40% >= battery < 70%  
- 3 bar : battery >= 70%    
  
Arguments:
* int **x** - start column    
* int **y** - start row  
* int **percentage** - battery level percentage  

usage:
```javascript
// args: (x,y,percentage)
await oled.battery(1,1,20);
```  

### bluetooth  
Draw a bluetooth icon
  
usage:
```javascript
//args: (x,y)
await oled.bluetooth(1,1);  
```
  
### wifi  
Draw a WiFi signal strength in percentage indicator. This method allows for up to 4 different signal  strength of the WiFi signal:    
- 0 bar : signal < 10%    
- 1 bar : 10% >= signal < 40%  
- 2 bar : 40% >= signal < 70%  
- 3 bar : signal >= 70%    
  
Arguments:
* int **x** - start column    
* int **y** - start row  
* int **percentage** - signal strength in percentage  

usage:
```javascript
// args: (x,y,percentage)
await oled.wifi(1,1,20);
``` 

### image  
A wrapper for `drawRGBAImage` that supports a fix animation. The animation always start from `x=1` and `y=1`. 

Arguments:
* int **x** - start column (ignored on `animation = true`)  
* int **y** - start row (ignored on `animation=true`)  
* string **image** - full path to the image or the filename of the image in the `resources` folder   
* object **font** - font to draw "error" message  
* boolean **clear** - clear the display before the draw  
* boolean **reset** - stop all animations  
* boolean **animated** - enable/disable animation  
* boolean **wrapping** - enable/disable of the error message wrapping  

usage:
```javascript
import font from 'oled-font-5x7';
await oled.image(1,1,'rpi-frambuesa.png',font.oled_5x7,true,false,false,true);
```