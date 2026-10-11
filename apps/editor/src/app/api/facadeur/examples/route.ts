/**
 * @deprecated Legacy file writes bypass the project API and must not mutate project files.
 * Use the project Save API or Export JSON.
 */
export async function PUT() {
  return Response.json({ error: 'Use the project Save API or Export JSON.' }, { status: 410 });
}
