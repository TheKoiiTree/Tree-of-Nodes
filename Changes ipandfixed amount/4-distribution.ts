export const distribution = async (winners: string[], config: any): Promise<{ [key: string]: number }> => {
  const fixedReward = 10; // ← pas dit aan als je een ander bedrag wilt

  const rewards: { [key: string]: number } = {};

  for (const winner of winners) {
    rewards[winner] = fixedReward;
  }

  return rewards;
};