export const contributionDay = now => new Date(now + 7*3600000).toISOString().slice(0,10);
export function initContributionLimit(sql) {
  sql('CREATE TABLE IF NOT EXISTS contribution_limits(day TEXT,client TEXT,count INTEGER NOT NULL,PRIMARY KEY(day,client))');
}
export function claimContribution(sql, client, now=Date.now(), release=false) {
  const day=contributionDay(now);
  sql('DELETE FROM contribution_limits WHERE day<?',day);
  if(release){sql('UPDATE contribution_limits SET count=MAX(0,count-1) WHERE day=? AND client=?',day,client);return;}
  const row=sql('INSERT INTO contribution_limits VALUES(?,?,1) ON CONFLICT(day,client) DO UPDATE SET count=count+1 WHERE count<3 RETURNING count',day,client)[0];
  return row ? 3-row.count : null;
}
