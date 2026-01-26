export const getPublicAssetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${encodeURI(path)}`;
