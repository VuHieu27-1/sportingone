import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class ProvincesApiService {
  private readonly baseUrl = 'https://provinces.open-api.vn/api/v1';

  /**
   * Retrieves Provinces information.
   */
  async fetchProvinces(): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/p/`);
      if (!res.ok) {
        throw new Error(`Failed to fetch provinces, status: ${res.status}`);
      }
      return await res.json();
    } catch (error: any) {
      throw new InternalServerErrorException(error.message || 'Error fetching provinces from open-api');
    }
  }

  /**
   * Retrieves all Wards directly by Province code.
   */
  async fetchWardsByProvince(provinceCode: number): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/p/${provinceCode}?depth=3`);
      if (!res.ok) {
        throw new Error(`Failed to fetch wards for province ${provinceCode}, status: ${res.status}`);
      }
      const data = await res.json();
      const districts = data.districts || [];
      const allWards: any[] = [];
      for (const dist of districts) {
        if (Array.isArray(dist.wards)) {
          for (const ward of dist.wards) {
            allWards.push({
              code: ward.code,
              name: ward.name,
              codename: ward.codename,
              division_type: ward.division_type,
            });
          }
        }
      }
      return allWards;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message || 'Error fetching wards from open-api');
    }
  }
}
