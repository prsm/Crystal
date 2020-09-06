import jsdom from 'jsdom';
import fs from 'fs';
import jimp from 'jimp';

import config from '../config';

export class ChartHandler {
    private _window: jsdom.DOMWindow;

    constructor() { }

    public async draw(width: number, height: number, configuration: any, filePath: string) {
        this._setOptions(configuration);
        const dom = new jsdom.JSDOM(`
        <html>
            <body>
                <div style="font-size:12; width:${width}; height:${height};">
                    <canvas id="drawCanvas" width="${width}" height="${height}"></canvas>
                </div>
                <p id="base64Image"></p>
            </body>
        </html>`, { runScripts: 'dangerously' });
        this._window = dom.window;

        // Load the chart.js libary into the dom
        const chartjs = fs.readFileSync(`${config.rootPath}/libraries/Chart.min.js`, { encoding: "utf-8" });
        const scriptElement = this._window.document.createElement('script');
        scriptElement.textContent = chartjs;
        this._window.document.body.appendChild(scriptElement);

        // generate chart
        this._window.eval(`
            canvas = document.getElementById('drawCanvas');
            imageP = document.getElementById('base64Image');
            
            ctx = canvas.getContext('2d');

            Chart.defaults.global.defaultFontSize=50;
            Chart.defaults.global.defaultFontColor='#FFFFFF';

            new Chart(ctx, ${JSON.stringify(configuration)});
            const base64 = canvas.toDataURL();
            imageP.innerHTML = base64;
        `);

        // save chart to file
        await this._writeImageToFile(filePath, width, height);
    }

    // set options which are required
    private _setOptions(configuration: any) {
        configuration.options.animation = { duration: 0 };
        configuration.options.responsive = false;
    }

    // get base64 string and save it to a png image
    private async _writeImageToFile(filePath: string, width: number, height: number) {
        fs.writeFileSync(filePath, this._window.document.getElementById('base64Image').innerHTML.replace(/^data:image\/png;base64,/, ''), { encoding: 'base64' });

        const image = await jimp.read(filePath);

        const bgImage = new jimp(width, height, '#36393F');
        bgImage.composite(image, 0, 0).write(filePath);
    }

}