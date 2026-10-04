import { readProjectFiles, projectFileError } from '../../../../domain/project/files.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await readProjectFiles());
  } catch (error) {
    return projectFileError(error);
  }
}
