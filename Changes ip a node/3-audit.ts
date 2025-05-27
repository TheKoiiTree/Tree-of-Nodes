export const audit = async (submissions: any[], config: any): Promise<string[]> => {
  const ipCountMap: { [ip: string]: any[] } = {};
  const winners: string[] = [];

  for (const submission of submissions) {
    const ip = submission.output?.ip;
    if (!ip) continue;

    if (!ipCountMap[ip]) {
      ipCountMap[ip] = [];
    }

    ipCountMap[ip].push(submission);
  }

  for (const ip in ipCountMap) {
    const subs = ipCountMap[ip];
    const allowed = subs.slice(0, 4); // Max 4 per IP

    for (const s of allowed) {
      winners.push(s.id);
    }
  }

  return winners;
};
