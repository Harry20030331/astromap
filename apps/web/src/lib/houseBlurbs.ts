/** Short house themes for chart summaries. */
export const HOUSE_BLURBS: Record<number, { title: string; textEn: string }> = {
  1: { title: "1st house", textEn: "Self-presentation, body, beginnings" },
  2: { title: "2nd house", textEn: "Money, resources, values, security" },
  3: { title: "3rd house", textEn: "Learning, siblings, neighborhood, communication" },
  4: { title: "4th house", textEn: "Home, family, roots, private life" },
  5: { title: "5th house", textEn: "Creativity, romance, play, children" },
  6: { title: "6th house", textEn: "Work, health, habits, service" },
  7: { title: "7th house", textEn: "Partnership, contracts, open enemies" },
  8: { title: "8th house", textEn: "Shared resources, intimacy, change, crisis" },
  9: { title: "9th house", textEn: "Beliefs, travel, higher learning, meaning" },
  10: { title: "10th house", textEn: "Career, status, vocation, visibility" },
  11: { title: "11th house", textEn: "Friends, groups, hopes, networks" },
  12: { title: "12th house", textEn: "Solitude, subconscious, healing, closure" },
};

export function parseHouseNumber(house: string): number | null {
  const m = /^(\d+)/.exec(house.trim());
  return m ? Number(m[1]) : null;
}
