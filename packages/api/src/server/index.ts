export { apiController } from './controller.js';
export { DomainError } from '../errors.js';
// File adapter is also available for trusted server-side imports and persistence integration.
export {
  readProjectFiles,
  saveProjectFile,
  initializeProjectFiles,
  legacyProjectStorage,
} from './project/files.js';
