export interface Province {
  id: string;
  name: string;
}

export interface Ward {
  id: string;
  name: string;
  provinceId?: string;
}

export interface ProvinceItem {
  code: number;
  name: string;
}

export interface WardItem {
  code: number;
  name: string;
}
