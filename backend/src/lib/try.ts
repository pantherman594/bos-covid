export const tryParseInt = (a: any, radix = 10) => {
  const res = parseInt(a, radix);

  if (Number.isNaN(res)) {
    throw new Error('Invalid integer.');
  }

  return res;
};

export const tryTraverse = (obj: any, path: (string | number)[]): any => {
  if (path.length === 0) return obj;

  const [first, ...rest] = path;
  if (!obj[first]) {
    throw new Error(`Try traverse failed: '${first}' not found in object.`);
  }

  return tryTraverse(obj[first], rest);
};
