export type ProjectThread = "Systems" | "Products" | "Campaigns";

export interface Project {
  id: string;
  no: string;
  name: string;
  thread: ProjectThread;
  year: string;
  status: string;
}

// The catalogue order, numbering, and status live here. The article bodies
// stay in src/pages/index.astro; keep their No. and Fig. labels in step.
export const projects: Project[] = [
  {
    id: "meerkat",
    no: "01",
    name: "Meerkat",
    thread: "Systems",
    year: "2026",
    status: "By request"
  },
  {
    id: "mantis",
    no: "02",
    name: "Mantis",
    thread: "Systems",
    year: "2026",
    status: "Gallery"
  },
  {
    id: "prism",
    no: "03",
    name: "Prism",
    thread: "Systems",
    year: "2026",
    status: "Reports"
  },
  {
    id: "waste",
    no: "04",
    name: "Waste",
    thread: "Products",
    year: "2026",
    status: "Live"
  },
  {
    id: "botanibowl",
    no: "05",
    name: "BotaniBowl",
    thread: "Products",
    year: "2026",
    status: "Live"
  },
  {
    id: "hen-escape",
    no: "06",
    name: "Hen Escape",
    thread: "Campaigns",
    year: "2025",
    status: "Live"
  },
  {
    id: "rabbitry",
    no: "07",
    name: "Rabbitry",
    thread: "Campaigns",
    year: "2026",
    status: "Live"
  }
];
