import { Forecast, ForecastPoint } from "../data/Forecast";
import { ColorScale, Color } from "../ColorScale";
import * as L from 'leaflet';

export const colorScale = new ColorScale([
  [0.1, new Color(0x99, 0x00, 0x99, 1)],
  [0.2, new Color(0x99, 0x33, 0x33, 1)],
  [0.3, new Color(0xff, 0x00, 0x00, 1)],
  [0.4, new Color(0xff, 0x99, 0x00, 1)],
  [0.5, new Color(0xff, 0xcc, 0x00, 1)],
  [0.6, new Color(0xff, 0xff, 0x00, 1)],
  [0.7, new Color(0x66, 0xff, 0x00, 1)],
  [0.8, new Color(0x00, 0xff, 0xff, 1)],
  [0.9, new Color(0x99, 0xff, 0xff, 1)],
  [1.0, new Color(0xff, 0xff, 0xff, 1)]
]);

export class ThQ {

  constructor(readonly forecast: Forecast) {}

  renderPoint(forecastAtPoint: ForecastPoint, topLeft: L.Point, bottomRight: L.Point, ctx: CanvasRenderingContext2D): void {
    if (forecastAtPoint !== undefined) {
      const thq = value(
        forecastAtPoint.boundaryLayerDepth,
        forecastAtPoint.uWind,
        forecastAtPoint.vWind,
        forecastAtPoint.cloudCover
      );

      const color = colorScale.interpolate(thq);
      ctx.save();
      ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.40)`;
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ctx.restore();
    }
  }

}

/**
 * @param boundaryLayerDepth Depth of the boundary layer in meters
 * @param uWind              U part of wind in boundary layer in km/h
 * @param vWind              V part of wind in boundary layer in km/h
 * @param totalCloudCover    Total cloud cover between 0 and 1
 * @returns 
 */
export const value = (boundaryLayerDepth: number, uWind: number, vWind: number, totalCloudCover: number): number => {
  // Boundary Layer Depth
  const bld = boundaryLayerDepth;
  // coeff is 50% for a boundary layer depth of 400 m
  const bldCoeff = logistic(bld, 400, 4);

  // Boundary Layer Wind
  const u = uWind;
  const v = vWind;
  const windForce = Math.sqrt(u * u + v * v);
  // coeff is 50% for a wind force of 14 km/h
  const windCoeff = 1 - logistic(windForce, 15, 6);

  // Cloud cover
  const cloudCover = totalCloudCover;
  // coeff is 50% for a cloud cover of 60%
  const cloudCoverCoeff = (cloudCover === null || cloudCover === undefined) ? 1 : (1 - logistic(cloudCover, 0.6, 7));

  return bldCoeff * windCoeff * cloudCoverCoeff
};

/**
 * Logistic function (see https://en.wikipedia.org/wiki/Logistic_regression#Model)
 * @param x  input
 * @param mu “location parameter” (midpoint of the curve, where output = 50%)
 * @param k  steepness (value like 4 is quite smooth, whereas 7 is quite steep)
 */
const logistic = (x: number, mu: number, k: number): number => {
  const L = 1; // Output max value. In our case we want the output to be a value between 0 and 1
  const s = mu / k;
  return L / (1 + Math.exp(-(x - mu) / s))
};
