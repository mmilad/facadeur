const TOKEN_PATH = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;

export function isTokenPath(value: string) {
  return TOKEN_PATH.test(value);
}
