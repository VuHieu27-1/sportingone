import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeocodeResult {
  lat: number;
  lng: number;
  label?: string;
}

export interface DistanceMatrixItem {
  vendorId?: number;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
}

@Injectable()
export class OpenRouteServiceService {
  private readonly logger = new Logger(OpenRouteServiceService.name);
  private readonly baseUrl = 'https://api.openrouteservice.org';

  constructor(private readonly configService: ConfigService) { }

  private get apiKey(): string {
    return (
      this.configService.get<string>('ORS_API_KEY') ||
      this.configService.get<string>('OPENROUTESERVICE_API_KEY') ||
      ''
    );
  }

  /**
   * Internal helper to make a single Geocoding search API call with street-level interpolation.
   */
  private async fetchGeocodeApi(
    key: string,
    searchText: string,
    originalAddress?: string,
  ): Promise<GeocodeResult | null> {
    try {
      const url = `${this.baseUrl}/geocode/search?api_key=${encodeURIComponent(
        key,
      )}&text=${encodeURIComponent(searchText)}&boundary.country=VN&size=1`;
      const response = await fetch(url);

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(
          `Geocoding HTTP ${response.status} for "${searchText}": ${errText}`,
        );
        return null;
      }

      const data = await response.json();
      if (
        data &&
        data.features &&
        data.features.length > 0 &&
        data.features[0].geometry &&
        data.features[0].geometry.coordinates
      ) {
        const feature = data.features[0];
        let [lng, lat] = feature.geometry.coordinates;
        const label = feature.properties?.label || searchText;
        const accuracy = feature.properties?.accuracy;
        const bbox = feature.bbox;

        const sourceForNumber = originalAddress || searchText;
        const houseNumMatch = sourceForNumber.match(
          /(?:K|Kiệt|Ngõ|Hẻm|Số)?\s*(\d+)/i,
        );

        if (
          houseNumMatch &&
          bbox &&
          bbox.length === 4 &&
          (accuracy === 'centroid' || accuracy === 'street')
        ) {
          const houseNum = parseInt(houseNumMatch[1], 10);
          if (!isNaN(houseNum) && houseNum > 0) {
            const [minLng, minLat, maxLng, maxLat] = bbox;
            const ratio = Math.min(
              Math.max((houseNum % 1000) / 1000, 0.05),
              0.95,
            );

            lat = Number((minLat + (maxLat - minLat) * ratio).toFixed(6));
            lng = Number((minLng + (maxLng - minLng) * ratio).toFixed(6));

            this.logger.log(
              `Interpolated coordinates for house/kiệt ${houseNum} along street: lat=${lat}, lng=${lng}`,
            );
          }
        }

        return { lat, lng, label };
      }
      return null;
    } catch (error: any) {
      this.logger.error(
        `Geocoding exception for "${searchText}": ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Geocode an address string to [lng, lat] using OpenRouteService Geocoding API.
   * Performs multi-stage Vietnamese address cleaning preserving house/alley numbers.
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!address || !address.trim()) {
      return null;
    }

    const key = this.apiKey;
    if (!key) {
      this.logger.warn(
        'ORS_API_KEY chưa được cấu hình trong .env. Hệ thống chuyển sang chế độ dự phòng (Fallback).',
      );
      return this.fallbackGeocode(address);
    }

    try {
      let result = await this.fetchGeocodeApi(key, address, address);
      if (result) return result;

      const houseNumberAddress = address
        .replace(/^(?:K|Kiệt|Ngõ|Hẻm|Số)\s*(\d+)[\w/-]*\s*,?\s*/i, '$1 ')
        .trim();

      if (houseNumberAddress && houseNumberAddress !== address) {
        this.logger.log(
          `Thử tìm kiếm với số nhà (bỏ chữ K/Kiệt): "${houseNumberAddress}"`,
        );
        result = await this.fetchGeocodeApi(
          key,
          houseNumberAddress,
          address,
        );
        if (result) return result;
      }

      const alleyAddress = address
        .replace(/^(?:K|Kiệt)\s*(\d+)[\w/-]*\s*,?\s*/i, 'Ngõ $1 ')
        .trim();

      if (
        alleyAddress &&
        alleyAddress !== address &&
        alleyAddress !== houseNumberAddress
      ) {
        this.logger.log(
          `Thử tìm kiếm với định dạng Ngõ/Hẻm: "${alleyAddress}"`,
        );
        result = await this.fetchGeocodeApi(key, alleyAddress, address);
        if (result) return result;
      }

      const streetOnlyAddress = address
        .replace(/^(?:K|Kiệt|Ngõ|Hẻm|Số)\s*\d+[\w/-]*\s*,?\s*/i, '')
        .trim();

      if (
        streetOnlyAddress &&
        streetOnlyAddress !== address &&
        streetOnlyAddress !== houseNumberAddress
      ) {
        this.logger.log(
          `Thử tìm kiếm theo tên đường (bỏ hẳn số): "${streetOnlyAddress}"`,
        );
        result = await this.fetchGeocodeApi(
          key,
          streetOnlyAddress,
          address,
        );
        if (result) return result;
      }

      const simplifiedAddress = (
        houseNumberAddress ||
        streetOnlyAddress ||
        address
      )
        .replace(/(?:Phường|Quận|Thành phố|TP\.|Huyện|Xã|Thị trấn)\s+/gi, '')
        .trim();

      if (
        simplifiedAddress &&
        simplifiedAddress !== houseNumberAddress &&
        simplifiedAddress !== streetOnlyAddress &&
        simplifiedAddress !== address
      ) {
        this.logger.log(
          `Thử tìm kiếm địa chỉ đơn giản hóa từ khóa hành chính: "${simplifiedAddress}"`,
        );
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            address,
          )}&countrycodes=vn&limit=1`;
          const nomRes = await fetch(nominatimUrl, {
            headers: {
              'User-Agent': 'SportingONE/1.0 (contact@sporting.vn)',
            },
          });
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
              const lat = Number(parseFloat(nomData[0].lat).toFixed(6));
              const lng = Number(parseFloat(nomData[0].lon).toFixed(6));
              this.logger.log(`Geocoded via Nominatim: "${address}" -> (${lat}, ${lng})`);
              return { lat, lng, label: nomData[0].display_name || address };
            }
          }
        } catch (e: any) {
          this.logger.warn(`Nominatim geocode failed for "${address}": ${e.message}`);
        }

        result = await this.fetchGeocodeApi(key, simplifiedAddress, address);
        if (result) return result;
      }

      return this.fallbackGeocode(address);
    } catch (error: any) {
      this.logger.error(`Geocoding error for "${address}": ${error.message}`);
      return this.fallbackGeocode(address);
    }
  }

  async calculateMatrix(
    origin: [number, number],
    destinations: Array<[number, number]>,
    profile: string = 'driving-car',
  ): Promise<Array<{ distanceMeters: number; durationSeconds: number }>> {
    if (!destinations || destinations.length === 0) {
      return [];
    }

    const key = this.apiKey;
    if (!key) {
      this.logger.warn(
        'ORS_API_KEY not found. Using Haversine formula calculation fallback.',
      );
      return destinations.map((dest) => this.calculateHaversine(origin, dest));
    }

    try {
      const url = `${this.baseUrl}/v2/matrix/${profile}`;
      const locations = [origin, ...destinations];
      const sources = [0];
      const destIndices = destinations.map((_, index) => index + 1);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: key,
        },
        body: JSON.stringify({
          locations,
          sources,
          destinations: destIndices,
          metrics: ['distance', 'duration'],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(
          `ORS Matrix API error ${response.status}: ${errText}`,
        );
        return destinations.map((dest) =>
          this.calculateHaversine(origin, dest),
        );
      }

      const data = await response.json();
      const distancesRow = data.distances ? data.distances[0] : [];
      const durationsRow = data.durations ? data.durations[0] : [];

      return destinations.map((dest, i) => {
        const distanceMeters =
          distancesRow[i] !== undefined && distancesRow[i] !== null
            ? Math.round(distancesRow[i])
            : this.calculateHaversine(origin, dest).distanceMeters;

        const durationSeconds =
          durationsRow[i] !== undefined && durationsRow[i] !== null
            ? Math.round(durationsRow[i])
            : this.calculateHaversine(origin, dest).durationSeconds;

        return { distanceMeters, durationSeconds };
      });
    } catch (error: any) {
      this.logger.error(`ORS Matrix API exception: ${error.message}`);
      return destinations.map((dest) => this.calculateHaversine(origin, dest));
    }
  }

  /**
   * Fallback geocode logic (supports lat,lng formatted strings or Vietnamese district/province heuristics)
   */
  private fallbackGeocode(address: string): GeocodeResult | null {
    const coordMatch = address.match(
      /^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/,
    );
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      return { lat, lng, label: address };
    }

    const clean = (address || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');

    this.logger.warn(
      `Could not geocode "${address}". Returning default center.`,
    );
    return null;
  }

  /**
   * Haversine formula calculation for straight-line distance fallback
   */
  private calculateHaversine(
    origin: [number, number],
    dest: [number, number],
  ): { distanceMeters: number; durationSeconds: number } {
    const [lon1, lat1] = origin;
    const [lon2, lat2] = dest;

    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = Math.round(R * c);

    const durationSeconds = Math.round(distanceMeters / 8.33);

    return { distanceMeters, durationSeconds };
  }
}
