import { saveProjectFile, projectFileError } from '../../../../../../../domain/project/files.js';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return Response.json(await saveProjectFile(id, await request.json()));
  } catch (error) {
    return projectFileError(error);
  }
}
