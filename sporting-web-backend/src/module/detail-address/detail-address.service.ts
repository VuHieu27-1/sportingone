import { Injectable } from '@nestjs/common';
import { ProvincesApiService } from '../../common/provinces/provinces.service';
import { OpenRouteServiceService } from '../../common/open-route-service/open-route-service.service';

@Injectable()
export class DetailAddressService {
  constructor(
    private readonly provincesApiService: ProvincesApiService,
    private readonly openRouteService: OpenRouteServiceService,
  ) {}

  /**
   * Retrieves AllProvinces information.
   */
  async getAllProvinces() {
    return this.provincesApiService.fetchProvinces();
  }

  /**
   * Retrieves WardsByProvince information.
   */
  async getWardsByProvince(provinceCode: number) {
    return this.provincesApiService.fetchWardsByProvince(provinceCode);
  }

  /**
   * Geocodes an address string to { lat, lng, fullAddress }.
   */
  async geocodeAddress(address: string) {
    if (!address || !address.trim()) {
      return { success: false, message: 'Địa chỉ không được để trống' };
    }
    const result = await this.openRouteService.geocodeAddress(address.trim());
    if (result) {
      return {
        success: true,
        data: {
          lat: result.lat,
          lng: result.lng,
          fullAddress: result.label || address.trim(),
        },
      };
    }
    return { success: false, message: 'Không thể tìm thấy tọa độ cho địa chỉ này' };
  }
}
