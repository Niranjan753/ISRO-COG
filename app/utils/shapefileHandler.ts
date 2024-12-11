import * as shapefile from 'shapefile';
import { Feature, FeatureCollection } from 'geojson';

export async function loadShapefile(filePath: string): Promise<FeatureCollection> {
  try {
    const features: Feature[] = [];
    const source = await shapefile.open(filePath);
    
    let result = await source.read();
    while (!result.done) {
      if (result.value && result.value.type === 'Feature') {
        features.push(result.value);
      }
      result = await source.read();
    }

    return {
      type: 'FeatureCollection',
      features: features
    };
  } catch (error) {
    console.error('Error loading shapefile:', error);
    throw error;
  }
}
