import { Forecast, ForecastData } from "../Forecast";
import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';

export const colorScale = new ColorScale([
  [0.1, new Color(0x99, 0x00, 0x99)],
  [0.2, new Color(0x99, 0x33, 0x33)],
  [0.3, new Color(0xff, 0x00, 0x00)],
  [0.4, new Color(0xff, 0x99, 0x00)],
  [0.5, new Color(0xff, 0xcc, 0x00)],
  [0.6, new Color(0xff, 0xff, 0x00)],
  [0.7, new Color(0x66, 0xff, 0x00)],
  [0.8, new Color(0x00, 0xff, 0xff)],
  [0.9, new Color(0x99, 0xff, 0xff)],
  [1.0, new Color(0xff, 0xff, 0xff)]
]);

export class ThQ {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastData, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    if (forecastAtPoint !== undefined) {
      // Boundary Layer Height
      const blh = forecastAtPoint.blh;
      const blhCoeff = Math.min(blh / 800, 1); // >800 m = 100%

      // Boundary Layer Wind
      const u = forecastAtPoint.u;
      const v = forecastAtPoint.v;
      const windForce = Math.sqrt(u * u + v * v);
      // windForce <= 10 => windCoeff = 1
      // windForce >  30 => windCoeff ~= 0
      const windCoeff = Math.exp(-Math.max(windForce - 10, 0) / 10);

      // Cloud cover
      const cloudCover = forecastAtPoint.c;
      const cloudCoverCoeff = (cloudCover === null || cloudCover === undefined) ? 1 : (100 - cloudCover) / 100;

      const thq = blhCoeff * windCoeff * cloudCoverCoeff;

      const color = colorScale.interpolate(thq);
      ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.40)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.stroke();
    }
  }

}
