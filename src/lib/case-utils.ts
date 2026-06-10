function toSnakeCaseKey(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function toCamelCaseKey(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function convertKeys(obj: unknown, convert: (k: string) => string): unknown {
  if (Array.isArray(obj)) return obj.map((item) => convertKeys(item, convert));
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        convert(k),
        convertKeys(v, convert),
      ]),
    );
  }
  return obj;
}

export function deepToSnakeCase<T = unknown>(obj: T): unknown {
  return convertKeys(obj, toSnakeCaseKey);
}

export function deepToCamelCase<T = unknown>(obj: unknown): T {
  return convertKeys(obj, toCamelCaseKey) as T;
}
