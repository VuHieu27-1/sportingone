export interface NavigationItem {
  label: string;
  href: string;
  badge?: string;
}

export interface BenefitItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  highlightText?: string;
}

export interface MetricItem {
  id: string;
  value: string;
  label: string;
  sublabel: string;
}

export interface EcosystemModule {
  id: string;
  number: string;
  title: string;
  description: string;
  icon: string;
  tag: string;
}
