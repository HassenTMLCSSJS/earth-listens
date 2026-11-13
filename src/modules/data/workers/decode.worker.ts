/// <reference lib="webworker" />
import { gridRegionStats } from '../decode';

interface DecodeRequest {
  values: number[];
  width: number;
  height: number;
  bbox: [number, number, number, number];
}

self.onmessage = (event: MessageEvent<DecodeRequest>) => {
  const { values, width, height, bbox } = event.data;
  self.postMessage(gridRegionStats(values, width, height, bbox));
};
