export interface PatentClaim {
  number: number;
  text: string;
  depends_on: number | null;
  type: "independent" | "dependent";
}

export interface PatentParagraph {
  text: string;
  number: string | null;
}

export interface PatentSection {
  heading: string;
  paragraphs: PatentParagraph[];
}

export interface PatentCitationRef {
  publication_number: string;
  priority_date: string;
  publication_date: string;
  assignee: string;
  title: string;
  examiner_cited: boolean;
}

export interface NonPatentCitationRef {
  title: string;
}

export interface FamilyApplication {
  application_number: string;
  representative_publication: string;
  priority_date: string;
  filing_date: string;
  title: string;
  status: string;
  expiration: string;
}

export interface CountryStatus {
  country_code: string;
  publication_number: string;
  count: number;
}

export interface LegalEvent {
  date: string;
  code: string;
  title: string;
  attributes: { label: string; value: string }[];
}

export interface SimilarDocument {
  publication_number: string;
  publication_date: string;
  title: string;
}

export interface Patent {
  title: string;
  patent_number: string;
  filing_date: string;
  publication_date: string;
  inventors: string[];
  assignee: string;
  classifications: string[];
  abstract: string;
  claims: PatentClaim[];
  description: PatentSection[];
  pdf_url: string;
  figure_urls: string[];
  priority_date?: string;
  patent_citations?: PatentCitationRef[];
  cited_by?: PatentCitationRef[];
  non_patent_citations?: NonPatentCitationRef[];
  family_applications?: FamilyApplication[];
  country_status?: CountryStatus[];
  legal_events?: LegalEvent[];
  similar_documents?: SimilarDocument[];
}
