![npm version](https://img.shields.io/npm/v/oled-rpi-i2c-bus-async.svg?style=flat)
![downloads over month](https://img.shields.io/npm/dm/oled-rpi-i2c-bus-async.svg?style=flat)
![license](https://img.shields.io/npm/l/oled-rpi-i2c-bus-async.svg?style=flat)
![node version](https://img.shields.io/node/v/oled-rpi-i2c-bus-async.svg?style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-Supported-blue.svg)
![build status](https://img.shields.io/github/actions/workflow/status/grevelle/oled-rpi-i2c-bus-async/node.js.yml?branch=main&style=flat)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)

# Asynchronous OLED JS Pi over i2c-bus

## Table of Contents
- [What is this?](#what-is-this)
- [Features](#features)
- [Installation](#installation)
  - [I2C Configuration](#i2c-configuration)
  - [Troubleshooting](#troubleshooting)
  - [Finding Your OLED Address](#wait-how-do-i-find-out-the-i2c-address-of-my-oled-screen)
- [Usage Examples](#i2c-screens)
  - [Basic Example (JavaScript)](#i2c-example)
  - [TypeScript Example](#typescript-example)
  - [Running Example Scripts](#running-example-scripts)
- [API Reference](#available-methods)
  - [Display Control](#display-control)
  - [Drawing Methods](#drawing-methods)
  - [Text Methods](#text-methods)
  - [Image Display](#image-display)
  - [UI Components](#ui-components)
- [Performance Optimization](#performance-optimization)
- [Logging and Debugging](#logging-and-debugging)
- [Contributing](#contributing)
- [License](#license)

## What is this?

This is a fork of the package [`oled-rpi-i2c-bus`](https://github.com/hadifikri/oled-rpi-i2c-bus), which itself is a fork of [`oled-js-pi`](https://github.com/kd7yva/oled-js-pi). This version works through the `i2c-bus` package and does not use the `i2c` package.

A NodeJS driver for I2C/SPI compatible monochrome OLED screens; to be used on the Raspberry Pi. Works with 128 x 32, 128 x 64, and 96 x 16 sized screens, of the SSD1306/SH1106 OLED/PLED Controller (read the [datasheet here](http://www.adafruit.com/datasheets/SSD1306.pdf)).

## Features

This library includes several significant enhancements:

1. **Fully Asynchronous API**: Uses the Promise-based methods of the `i2c-bus` package for improved performance and non-blocking operations.
2. **ES6 Modules**: Modern JavaScript syntax with import/export for better code organization.
3. **TypeScript Support**: Complete type definitions for all classes and functions.
4. **Logger Utility**: Configurable logging levels to help with debugging.
5. **Batch Command Processing**: Optimized I2C operations for better performance.
6. **Memory Management**: Improved handling for large bitmap operations.
7. **Multiple Display Support**: Compatible with both SSD1306 and SH1106 OLED controllers.

The original code is based on the blog post and code by Suz Hinton.

## Installation

If you haven't already, install [NodeJS](http://nodejs.org/) 16.0.0 or higher.

```bash
npm install oled-rpi-i2c-bus-async
```

### I2C Configuration

Raspberry Pi allows for software I2C. To enable software I2C, add `dtoverlay=i2c-gpio,bus=3` to `/boot/config.txt`. The software I2C would be available on `bus` no `3` 
where the `SDA` is on pin `GPIO23`/`BCM 16` and `SCL` is on pin `GPIO24`/`BCM 18`. 

### Troubleshooting

For `SH1106` displays, if you get an error:
```
"Error: , Remote I/O error"
```

You might have to lower the baudrate by adding the following line to `/boot/config.txt` and rebooting the Pi:
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

### TypeScript Example

```typescript
import { PromisifiedBus } from 'i2c-bus';
import Oled, { OledOptions, Font } from 'oled-rpi-i2c-bus-async';
import font from 'oled-font-5x7';

// Type-safe configuration
const options: OledOptions = {
  width: 128,
  height: 64,
  address: 0x3D,
  bus: 1,
  driver: 'SSD1306',
  logLevel: 'info'
};

const setupDisplay = async () => {
  try {
    const i2cBus = await (await import('i2c-bus')).openPromisified(options.bus);
    const oled = new Oled(i2cBus, options);
    
    await oled.clearDisplay();
    await oled.setCursor(1, 1);
    await oled.writeString(font as Font, 1, 'TypeScript Example', 1, true);
    
    // Draw some UI elements
    await oled.battery(5, 30, 80);
    await oled.wifi(50, 30, 60);
  } catch (err) {
    console.error('Error:', err);
  }
};

setupDisplay();
```

### Wait, how do I find out the I2C address of my OLED screen?

You can use the `i2cdetect` command on your Raspberry Pi to find connected I2C devices:

```bash
sudo apt-get install -y i2c-tools
sudo i2cdetect -y 1  # Use appropriate bus number (typically 1)
```

Common addresses for OLED displays are `0x3C` and `0x3D`.

### Running Example Scripts

The package includes several example scripts that demonstrate different features:

```bash
# Run examples using npm scripts
npm run example           # Basic text display example
npm run example:battery   # Battery indicator example
npm run example:bluetooth # Bluetooth icon example
npm run example:wifi      # WiFi signal strength example
npm run example:drawLine  # Line drawing example
npm run example:drawPixel # Pixel drawing example
npm run example:fillRect  # Rectangle drawing example
npm run example:bitmap    # Bitmap image example
npm run example:image     # PNG image example
```

## Available Methods

### Display Control

#### clearDisplay
Fills the buffer with 'off' pixels (0x00). Optional bool argument specifies whether screen updates immediately with result. Default is true.

```javascript
await oled.clearDisplay();
```

#### dimDisplay
Lowers the contrast on the display. This method takes one argument, a boolean. True for dimming, false to restore normal contrast.

```javascript
await oled.dimDisplay(true);
```

#### invertDisplay
Inverts the pixels on the display. Black becomes white, white becomes black. This method takes one argument, a boolean. True for inverted state, false to restore normal pixel colors.

```javascript
await oled.invertDisplay(true);
```

#### turnOffDisplay
Turns the display off.

```javascript
await oled.turnOffDisplay();
```

#### turnOnDisplay
Turns the display on.

```javascript
await oled.turnOnDisplay();
```

#### update
Sends the entire buffer in its current state to the oled display, effectively syncing the two. This method generally does not need to be called, unless you're messing around with the framebuffer manually before you're ready to sync with the display. It's also needed if you're choosing not to draw on the screen immediately with the built in methods.

```javascript
await oled.update();
```

### Drawing Methods

#### drawPixel
Draws a pixel at a specified position on the display. This method takes one argument: a multi-dimensional array containing either one or more sets of pixels.

Each pixel needs an x position, a y position, and a color. Colors can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.

Optional bool as last argument specifies whether screen updates immediately with result. Default is true.

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

#### drawLine
Draws a one pixel wide line.

Arguments:
+ int **x0, y0** - start location of line
+ int **x1, y1** - end location of line
+ int **color** - can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.

Optional bool as last argument specifies whether screen updates immediately with result. Default is true.

```javascript
// args: (x0, y0, x1, y1, color)
await oled.drawLine(1, 1, 128, 32, 1);
```

#### fillRect
Draws a filled rectangle.

Arguments:
+ int **x0, y0** - top left corner of rectangle
+ int **w, h** - width and height of rectangle
+ int **color** - can be specified as either 0 for 'off' or black, and 1 or 255 for 'on' or white.

Optional bool as last argument specifies whether screen updates immediately with result. Default is true.

```javascript
// args: (x, y, w, h, color)
await oled.fillRect(1, 1, 10, 20, 1);
```

### Text Methods

#### setCursor
Sets the x and y position of 'cursor', when about to write text. This effectively helps tell the display where to start typing when writeString() method is called.

Call setCursor just before writeString().

```javascript
// sets cursor to x = 1, y = 1
await oled.setCursor(1, 1);
```

#### writeString
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

### Image Display

#### drawBitmap
Draws a bitmap using raw pixel data returned from an image parser. The image sourced must be monochrome, and indexed to only 2 colors. Resize the bitmap to your screen dimensions first. Using an image editor or ImageMagick might be required.

Optional bool as last argument specifies whether screen updates immediately with result. Default is true.

Tip: use a NodeJS image parser to get the pixel data, such as [pngparse](https://www.npmjs.org/package/pngparse). A demonstration of using this is below.

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

#### drawRGBAImage
Draw an RGBA coded image at specific coordinates. This only supports a monochrome
OLED so transparent pixels must be 100% transparent, off pixels should have an
RGB value of (0, 0, 0), and pixels with any color value will be considered on.

Use a library such as [pngjs](https://www.npmjs.com/package/pngjs) to read a png
file into the required rgba data structure.

##### Example with PNG Stream

```javascript
import fs from 'fs';
import { PNG } from 'pngjs';
import i2c from 'i2c-bus';
import Oled from 'oled-rpi-i2c-bus-async';

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

  // Function to draw the image
  const drawImage = async (image) => {
    const x = Math.floor(Math.random() * (display.WIDTH - image.width / 2));
    const y = Math.floor(Math.random() * (display.HEIGHT - image.height / 2));
    await display.drawRGBAImage(image, x, y);
  };

  // Read and draw the PNG image
  fs.createReadStream('./test.png')
    .pipe(new PNG({ filterType: 4 }))
    .on('parsed', async function () {
      setInterval(async () => {
        await drawImage(this);
      }, 1000);
    });
};

setupOled();
```

#### image  
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

```javascript
import font from 'oled-font-5x7';
await oled.image(1,1,'rpi-frambuesa.png',font.oled_5x7,true,false,false,true);
```

#### startScroll
Scrolls the current display either left or right.
Arguments:
+ string **direction** - direction of scrolling. 'left' or 'right'
+ int **start** - starting row of scrolling area
+ int **stop** - end row of scrolling area

Note: This is only supported on SSD1306 displays, not on SH1106.

```javascript
// args: (direction, start, stop)
await oled.startScroll('left', 0, 15); // this will scroll an entire 128 x 32 screen
```

#### stopScroll
Stops all current scrolling behavior.

```javascript
await oled.stopScroll();
```

### UI Components

#### battery  
Draw a battery level in percentage indicator. This method allows for up to 4 different states of the battery:    
- 0 bar : battery < 10%    
- 1 bar : 10% >= battery < 40%  
- 2 bar : 40% >= battery < 70%  
- 3 bar : battery >= 70%    
  
Arguments:
* int **x** - start column    
* int **y** - start row  
* int **percentage** - battery level percentage  

```javascript
// args: (x,y,percentage)
await oled.battery(1,1,20);
```  

#### bluetooth  
Draw a bluetooth icon
  
```javascript
//args: (x,y)
await oled.bluetooth(1,1);  
```
  
#### wifi  
Draw a WiFi signal strength in percentage indicator. This method allows for up to 4 different signal strength of the WiFi signal:    
- 0 bar : signal < 10%    
- 1 bar : 10% >= signal < 40%  
- 2 bar : 40% >= signal < 70%  
- 3 bar : signal >= 70%    
  
Arguments:
* int **x** - start column    
* int **y** - start row  
* int **percentage** - signal strength in percentage  

```javascript
// args: (x,y,percentage)
await oled.wifi(1,1,20);
``` 

## Performance Optimization

This library includes several performance optimizations:

1. **Batch Command Processing**: Multiple I2C commands are grouped into single transactions, reducing overhead.
2. **Dirty Rectangle Tracking**: Only updates portions of the display that have changed.
3. **Page Grouping**: Groups updates by display pages for more efficient refresh.
4. **Parallel Processing**: Where possible, UI operations are broken into parallel tasks.
5. **Memory Management**: Optimized buffer handling for large bitmap operations.

These optimizations are particularly noticeable when displaying complex UIs or animations.

## Logging and Debugging

The library includes a built-in logging utility with configurable verbosity levels:

```javascript
const opts = {
  width: 128,
  height: 64,
  address: 0x3C,
  bus: 1,
  driver: "SSD1306",
  logLevel: "debug"  // Available: "debug", "info", "warn", "error", "silent"
};
```

When debugging issues:
1. Set the log level to `debug` to see all operations.
2. Check for I2C communication errors in the logs.
3. Verify your display address and bus configuration.
4. Ensure your Raspberry Pi I2C interface is enabled.
5. For SH1106 displays, check the baudrate settings.

## Contributing

Contributions are welcome! Please check out our [contributing guidelines](https://github.com/grevelle/oled-rpi-i2c-bus-async/blob/main/CONTRIBUTING.md) for details on how to submit pull requests, report issues, or suggest features.

## License

This project is licensed under the MIT License - see the LICENSE file for details.