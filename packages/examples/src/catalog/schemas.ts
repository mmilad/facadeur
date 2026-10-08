import type { ProjectCatalog } from "@facadeur/domain";
import { schema as imageSchema } from "../image/schema";

export const schemas = { "550e8400-e29b-41d4-a716-000000000001": imageSchema } satisfies NonNullable<ProjectCatalog["schemas"]>;
