import { TechnicalArsenal } from "@/components/ClientOnlyComponents";

import CubeScroll from "@/components/CubeScroll";
import ProjectArchive from "@/components/ProjectArchive";
import Navbar from "@/components/Navbar";
import About from "@/components/About";
import WhatIDoPillars from "@/components/WhatIDoPillars";
import ExperienceStory from "@/components/ExperienceStory";
import AchievementShowcase from "@/components/AchievementShowcase";
import ContactClean from "@/components/ContactClean";
import FooterClean from "@/components/FooterClean";

export const metadata = {
  title: "Kiran Rathod | AI/ML & Creative Developer",
  description: "Personal portfolio of Kiran Rathod specializing in AI, Machine Learning, and Creative Tech.",
};

export default function Home() {
  return (
    <main className="relative bg-[#121212]">
      <Navbar />
      {/* First screen: the scroll-driven cube story (the banknote hero lives on in components/NoteHero) */}
      <CubeScroll />

      <About />
      <WhatIDoPillars />
      <TechnicalArsenal />
      <ExperienceStory />
      <AchievementShowcase />

      {/* Projects Grid Section */}
      <ProjectArchive />
      <ContactClean />
      <FooterClean />
    </main>
  );
}
