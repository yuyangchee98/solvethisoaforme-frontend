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
}
