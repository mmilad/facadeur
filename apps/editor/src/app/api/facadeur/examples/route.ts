/** Legacy file writes bypass the shared Y.Doc and must no longer mutate project files. */
export async function PUT() {
  return Response.json({ error: 'Use the project Save API or Export JSON.' }, { status: 410 });
}
