import { Injectable, Logger } from '@nestjs/common';

export interface DetailedLocationInfo {
  lat: number;
  lng: number;
  fullAddress: string;
  road: string;
  ward: string;
  district: string;
  city: string;
  country: string;
  ip?: string;
  method: 'hardware_gps' | 'ip_geolocation';
  source: string;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);

  private isPrivateOrLocalIp(ip?: string): boolean {
    if (!ip) return true;
    const cleanIp = ip.replace(/^::ffff:/, '').trim();
    return (
      cleanIp === '127.0.0.1' ||
      cleanIp === '::1' ||
      cleanIp === 'localhost' ||
      cleanIp.startsWith('192.168.') ||
      cleanIp.startsWith('10.') ||
      cleanIp.startsWith('172.16.')
    );
  }

  private async getIpLocation(ip?: string): Promise<{
    ip: string;
    lat: number;
    lng: number;
    city: string;
    country: string;
    source: string;
  }> {
    const isLocal = this.isPrivateOrLocalIp(ip);
    const targetIp = isLocal ? '' : ip?.replace(/^::ffff:/, '').trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = targetIp
        ? `http://ip-api.com/json/${targetIp}?fields=status,country,regionName,city,lat,lon,query`
        : `http://ip-api.com/json/?fields=status,country,regionName,city,lat,lon,query`;

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          return {
            ip: data.query || targetIp || '127.0.0.1',
            lat: data.lat || 10.7769,
            lng: data.lon || 106.7009,
            city: data.city || data.regionName || 'TP. Hồ Chí Minh',
            country: data.country || 'Việt Nam',
            source: 'ip-api.com',
          };
        }
      }
    } catch (error) {
      this.logger.warn(`[GeolocationService] ip-api error: ${error.message}`);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = targetIp ? `https://ipapi.co/${targetIp}/json/` : `https://ipapi.co/json/`;
      const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          return {
            ip: data.ip || targetIp || '127.0.0.1',
            lat: data.latitude || 10.7769,
            lng: data.longitude || 106.7009,
            city: data.city || data.region || 'TP. Hồ Chí Minh',
            country: data.country_name || 'Việt Nam',
            source: 'ipapi.co',
          };
        }
      }
    } catch (error) {
      this.logger.warn(`[GeolocationService] ipapi.co error: ${error.message}`);
    }

    return {
      ip: targetIp || ip || '127.0.0.1',
      lat: 10.7769,
      lng: 106.7009,
      city: 'TP. Hồ Chí Minh',
      country: 'Việt Nam',
      source: 'local_fallback',
    };
  }

  /**
   * Reverse Geocoding: Look up detailed address (Street, Ward, District, City/Province) from coordinates.
   */
  async reverseGeocode(lat: number, lng: number): Promise<{
    road: string;
    ward: string;
    district: string;
    city: string;
    country: string;
    fullAddress: string;
    source: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SportingWeb/1.0',
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const addr = data.address || {};

        const road = addr.road || addr.pedestrian || addr.street || addr.footway || '';
        const city = addr.city || addr.state || addr.province || addr.region || 'N/A';
        const country = addr.country || 'Việt Nam';

        let ward = 'N/A';
        let district = 'N/A';
        const primaryDistrict =
          addr.city_district ||
          addr.district ||
          addr.county ||
          addr.state_district ||
          addr.borough ||
          addr.municipality ||
          addr.subdistrict;

        if (primaryDistrict) {
          district = primaryDistrict;
          ward =
            addr.quarter ||
            addr.suburb ||
            addr.village ||
            addr.commune ||
            addr.townland ||
            addr.neighbourhood ||
            'N/A';
        } else if (addr.quarter && addr.suburb) {
          ward = addr.quarter;
          district = addr.suburb;
        } else {
          ward =
            addr.suburb ||
            addr.quarter ||
            addr.village ||
            addr.commune ||
            addr.townland ||
            addr.neighbourhood ||
            'N/A';
        }
        if (district === 'N/A' && data.display_name) {
          const parts = data.display_name.split(',').map((p: string) => p.trim());
          for (const p of parts) {
            if (
              (p.startsWith('Quận ') ||
                p.startsWith('Huyện ') ||
                p.startsWith('Thị xã ') ||
                p.startsWith('TP ') ||
                p.startsWith('Thành phố ')) &&
              p !== city &&
              p !== ward
            ) {
              district = p;
              break;
            }
          }
        }

        const parts = [
          road,
          ward !== 'N/A' ? ward : '',
          city !== 'N/A' ? city : '',
          country,
        ].filter(Boolean);
        const fullAddress = parts.join(', ');

        return {
          road,
          ward,
          district: '',
          city,
          country,
          fullAddress,
          source: 'nominatim.openstreetmap.org',
        };
      }
    } catch (error) {
      this.logger.warn(`[GeolocationService] reverseGeocode error for (${lat}, ${lng}): ${error.message}`);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const city = data.principalSubdivision || data.city || 'N/A';
        const locality = data.locality || 'N/A';
        let district = 'N/A';

        if (data.localityInfo?.informative) {
          const distObj = data.localityInfo.informative.find(
            (item: any) =>
              item.description?.includes('quận') ||
              item.description?.includes('huyện') ||
              item.description?.includes('thị xã') ||
              item.name?.startsWith('Quận') ||
              item.name?.startsWith('Huyện'),
          );
          if (distObj) {
            district = distObj.name;
          }
        }

        return {
          road: '',
          ward: locality,
          district: district !== 'N/A' ? district : locality,
          city,
          country: data.countryName || 'Việt Nam',
          fullAddress: `${locality}, ${city}, ${data.countryName || 'Việt Nam'}`,
          source: 'bigdatacloud.net',
        };
      }
    } catch (error) {
      this.logger.warn(`[GeolocationService] BigDataCloud error for (${lat}, ${lng}): ${error.message}`);
    }

    return {
      road: '',
      ward: 'N/A',
      district: 'N/A',
      city: 'N/A',
      country: 'N/A',
      fullAddress: `Tọa độ: ${lat}, ${lng}`,
      source: 'fallback',
    };
  }

  /**
   * Fetches current device location from IP or browser GPS.
   */
  async getDeviceLocation(clientIp?: string, lat?: number, lng?: number): Promise<DetailedLocationInfo> {
    const isHardwareGps = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng);

    let targetLat = lat;
    let targetLng = lng;
    let userIp = clientIp;
    let initialSource = 'hardware_gps';

    if (!isHardwareGps) {
      const ipData = await this.getIpLocation(clientIp);
      targetLat = ipData.lat;
      targetLng = ipData.lng;
      userIp = ipData.ip;
      initialSource = ipData.source;
    }

    const currentLat = targetLat ?? 10.7769;
    const currentLng = targetLng ?? 106.7009;

    const geoDetails = await this.reverseGeocode(currentLat, currentLng);

    return {
      lat: currentLat,
      lng: currentLng,
      fullAddress: geoDetails.fullAddress,
      road: geoDetails.road,
      ward: geoDetails.ward,
      district: geoDetails.district,
      city: geoDetails.city,
      country: geoDetails.country,
      ip: userIp,
      method: isHardwareGps ? 'hardware_gps' : 'ip_geolocation',
      source: geoDetails.source !== 'fallback' ? geoDetails.source : initialSource,
    };
  }
}
