export type Project = {
  id: number;
  title: string;
  desc: string;
  image: string;
  tags: string[];
  github: string;
  live?: string; // only set when there is a real deployed demo
  icon: "plane" | "file" | "film" | "code" | "shield" | "cloud" | "flask";
  color: string; // accent colour this card lights up with on hover
};

/**
 * Projects shown in the archive box. Add, remove or reorder freely:
 * the box resizes itself to fit however many cards you list.
 * (Icons available: plane, file, film, code, shield, cloud, flask. `color` is the hover accent.)
 */
export const PROJECTS: Project[] = [
  {
    id: 1,
    title: "Predictive Maintenance with MLOps",
    desc: "End-to-end MLOps system predicting aircraft engine RUL using NASA C-MAPSS data. FastAPI endpoints, MLflow tracking, Prometheus + Grafana monitoring, AWS EC2 CI/CD.",
    image: "/projects/mlops.jpg",
    tags: ["Python", "MLflow", "FastAPI", "AWS"],
    github: "https://github.com/KiranRathod4/Predictive-Maintenance-with-MLOps",
    live: "https://predictive-maintenance-with-ml-ops.vercel.app/",
    icon: "plane",
    color: "#a78bfa",
  },
  {
    id: 2,
    title: "AI-Powered Resume Agent",
    desc: "Intelligent recruitment assistant with LangChain RAG + FAISS. Bulk processes 50+ resumes, improves ATS pass rate by 40%, dual LLM support (Llama 3.2 + GPT-4).",
    image: "/projects/resume-agent.jpg",
    tags: ["LangChain", "Ollama", "FAISS", "Streamlit"],
    github: "https://github.com/KiranRathod4/AI-powered-resume_agent",
    icon: "file",
    color: "#22d3ee",
  },
  {
    id: 3,
    title: "Netflix Data Analysis",
    desc: "EDA on Netflix's content catalog using Python and Pandas. Uncovers genre trends, release year patterns, and content type distribution with rich visualizations.",
    image: "/projects/netflix.jpg",
    tags: ["Python", "Pandas", "Matplotlib", "Seaborn"],
    github: "https://github.com/KiranRathod4/Netflix_data_analysis",
    icon: "film",
    color: "#fb923c",
  },
  {
    id: 4,
    title: "Chat with your Codebase RAG",
    desc: "RAG system using LangChain + local LLMs (Ollama) + FAISS to answer context-aware queries about any codebase's structure and logic.",
    image: "/projects/codebase-rag.jpg",
    tags: ["LangChain", "Ollama", "FAISS", "Python"],
    github: "https://github.com/KiranRathod4/Chat-with-your-codebase-RAG",
    icon: "code",
    color: "#f472b6",
  },
];
