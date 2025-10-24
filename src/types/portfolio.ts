export type ContentKey = 'home' | 'cv' | 'portfolio';

export type PortfolioCode = string;

export type WorkDetail = {
  fullName?: string;
  h2Name?: string;
  tableName?: string;
  yearBegin?: string;
  yearEnd?: string;
  intro?: string;
  introList?: string[];
  headPic?: string;
  tags?: string[];
  links?: Array<{ name?: string; link?: string }>;
  coWorkers?: Array<{ name?: string; work?: string; link?: string }>;
  content?: string;
};

export type PortfolioItem = {
  code: PortfolioCode;
  name: string;
  category: string;
  detail: WorkDetail;
};

export type PortfolioCategory = {
  name: string;
  items: PortfolioItem[];
};

export type PortfolioCategoryWithMatrix = PortfolioCategory & {
  itemsMap: Record<string, PortfolioItem>;
};

export type CvRouteValue =
  | string
  | {
      asset?: string;
      link?: string;
      showTypes?: string[];
      showGroups?: string[];
    };

export type CvSettings = {
  downloadUrl: string | null;
  link: string | null;
  groups: string[] | null;
};

export type PortfolioRouteEntry = {
  cv?: CvRouteValue;
  categories?: Record<string, PortfolioCode[]>;
};

export type PortfolioRouteConfig = Record<string, PortfolioRouteEntry>;

export type WorkGalleryItem = {
  type: 'image' | 'pdf';
  src: string;
};

export type WorkImages = {
  main: string | null;
  gallery: WorkGalleryItem[];
  videos: string[];
};

export type ExperienceEntry = {
  type: string;
  organisation: string;
  role: string;
  begin: string;
  end: string;
  relatedWorks: string[];
  description: string;
  showDefault: boolean;
  showGroups: string[];
};

export type ExperienceDataset = {
  typeOrder: string[];
  entries: ExperienceEntry[];
};

export type ExperienceGroup = {
  type: string;
  items: ExperienceEntry[];
};
